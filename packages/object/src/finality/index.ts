import bls from "@chainsafe/bls/herumi";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { BitSet } from "../hashgraph/bitset.js";
import type { Hash } from "../hashgraph/index.js";
import { type DRPPublicCredential, log } from "../index.js";
import type {
	AggregatedAttestation,
	Attestation,
} from "../proto/drp/object/v1/object_pb.js";

const DEFAULT_FINALITY_THRESHOLD = 0.51;

export interface FinalityConfig {
	finality_threshold?: number;
}

export class FinalityState {
	data: string;
	voterCredentials: DRPPublicCredential[];
	voterIndices: Map<string, number>;
	aggregation_bits: BitSet;
	signature?: Uint8Array;
	numberOfVotes: number;

	constructor(hash: Hash, voters: Map<string, DRPPublicCredential>) {
		this.data = hash;

		// deterministic order
		const peerIds = Array.from(voters.keys()).sort();
		this.voterCredentials = peerIds.map((peerId) =>
			voters.get(peerId),
		) as DRPPublicCredential[];

		this.voterIndices = new Map();
		for (let i = 0; i < peerIds.length; i++) {
			this.voterIndices.set(peerIds[i], i);
		}

		this.aggregation_bits = new BitSet(peerIds.length);
		this.numberOfVotes = 0;
	}

	addVote(peerId: string, signature: Uint8Array, verify = true) {
		const index = this.voterIndices.get(peerId);
		if (index === undefined) {
			throw new Error("Peer not found in voter list");
		}

		if (this.aggregation_bits.get(index)) {
			// voter already voted
			return;
		}

		if (verify) {
			// verify signature validity
			const publicKey = uint8ArrayFromString(
				this.voterCredentials[index].blsPublicKey,
				"base64",
			);
			const data = uint8ArrayFromString(this.data);
			if (!bls.verify(publicKey, data, signature)) {
				throw new Error("Invalid signature");
			}
		}

		this.aggregation_bits.set(index, true);
		if (!this.signature) {
			this.signature = signature;
		} else {
			this.signature = bls.aggregateSignatures([this.signature, signature]);
		}
		this.numberOfVotes++;
	}

	merge(attestation: AggregatedAttestation) {
		if (this.data !== attestation.data) {
			throw new Error("Hash mismatch");
		}

		if (this.signature) {
			return;
		}

		const aggregation_bits = new BitSet(
			this.voterCredentials.length,
			attestation.aggregationBits,
		);

		// public keys of voters who voted
		const publicKeys = this.voterCredentials
			.filter((_, i) => aggregation_bits.get(i))
			.map((voter) => uint8ArrayFromString(voter.blsPublicKey, "base64"));
		const data = uint8ArrayFromString(this.data);

		// verify signature validity
		if (!bls.verifyAggregate(publicKeys, data, attestation.signature)) {
			throw new Error("Invalid signature");
		}

		this.aggregation_bits = aggregation_bits;
		this.signature = attestation.signature;
		this.numberOfVotes = publicKeys.length;
	}
}

export class FinalityStore {
	states: Map<string, FinalityState>;
	finalityThreshold: number;

	constructor(config?: FinalityConfig) {
		this.states = new Map();
		this.finalityThreshold =
			config?.finality_threshold ?? DEFAULT_FINALITY_THRESHOLD;
	}

	initializeState(hash: Hash, voters: Map<string, DRPPublicCredential>) {
		if (!this.states.has(hash)) {
			this.states.set(hash, new FinalityState(hash, voters));
		}
	}

	// returns the number of votes required for the vertex to be finalized
	getQuorum(hash: Hash): number | undefined {
		const state = this.states.get(hash);
		if (state === undefined) {
			return;
		}
		return Math.ceil(state.voterCredentials.length * this.finalityThreshold);
	}

	// returns the number of votes for the vertex
	getNumberOfVotes(hash: Hash): number | undefined {
		return this.states.get(hash)?.numberOfVotes;
	}

	// returns true if the vertex is finalized
	isFinalized(hash: Hash): boolean | undefined {
		const numberOfVotes = this.getNumberOfVotes(hash);
		const quorum = this.getQuorum(hash);
		if (numberOfVotes !== undefined && quorum !== undefined) {
			return numberOfVotes >= quorum;
		}
	}

	// returns true if the specified peerId can vote on the vertex
	canVote(peerId: string, hash: Hash): boolean | undefined {
		return this.states.get(hash)?.voterIndices.has(peerId);
	}

	// returns true if the specified peerId has voted on the vertex
	voted(peerId: string, hash: Hash): boolean | undefined {
		const state = this.states.get(hash);
		if (state !== undefined) {
			const index = state.voterIndices.get(peerId);
			if (index !== undefined) {
				return state.aggregation_bits.get(index);
			}
		}
	}

	// add votes to the vertex
	addVotes(peerId: string, attestations: Attestation[], verify = true) {
		for (const attestation of attestations) {
			try {
				this.states
					.get(attestation.data)
					?.addVote(peerId, attestation.signature, verify);
			} catch (e) {
				log.error("::finality::addVotes", e);
			}
		}
	}

	// returns the attestations for the vertex
	getAttestation(hash: Hash): AggregatedAttestation | undefined {
		const state = this.states.get(hash);
		if (state !== undefined && state.signature !== undefined) {
			return {
				data: state.data,
				aggregationBits: state.aggregation_bits.toBytes(),
				signature: state.signature,
			};
		}
	}

	// merge multiple votes
	mergeVotes(attestations: AggregatedAttestation[]) {
		for (const attestation of attestations) {
			try {
				this.states.get(attestation.data)?.merge(attestation);
			} catch (e) {
				log.error("::finality::mergeVotes", e);
			}
		}
	}
}
