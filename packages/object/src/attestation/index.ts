import type { Hash } from "../hashgraph/index.js";
import { BitSet } from "../hashgraph/bitset.js";
import type { DRPPublicCredential } from "../index.js";
import bls from "@chainsafe/bls/herumi";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";

export class AttestationStore {
	private voterCredentials: DRPPublicCredential[];
	private voterIndices: Map<string, number>;
	private participants: BitSet;
	private aggregatedSignature?: Uint8Array;

	constructor(voters: Map<string, DRPPublicCredential>) {
		// deterministic order
		const peerIds = Array.from(voters.keys()).sort();
		this.voterCredentials = peerIds.map((peerId) =>
			voters.get(peerId),
		) as DRPPublicCredential[];

		this.voterIndices = new Map();
		for (let i = 0; i < peerIds.length; i++) {
			this.voterIndices.set(peerIds[i], i);
		}

		this.participants = new BitSet(peerIds.length);
	}

	canVote(voterPeerId: string) {
		return this.voterIndices.has(voterPeerId);
	}

	async addVote(voterPeerId: string, hash: Hash, signature: Uint8Array) {
		const index = this.voterIndices.get(voterPeerId);
		if (index === undefined) {
			throw new Error("Peer not found in voter list");
		}

		if (this.participants.get(index)) {
            // voter already voted
			return;
		}

        // verify signature validity
		if (
			!(await bls.asyncVerify(
				this.voterCredentials[index].blsPublicKey,
				uint8ArrayFromString(hash),
				signature,
			))
		) {
			throw new Error("Invalid signature");
		}

		if (!this.participants.get(index)) {
			this.participants.set(index, true);
			if (!this.aggregatedSignature) {
				this.aggregatedSignature = signature;
			} else {
				this.aggregatedSignature = bls.aggregateSignatures([
					this.aggregatedSignature,
					signature,
				]);
			}
		}
	}
}
