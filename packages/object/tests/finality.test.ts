import bls from "@chainsafe/bls/herumi";
import type { SecretKey as BlsSecretKey } from "@chainsafe/bls/types";
import { toString as uint8ArrayToString } from "uint8arrays";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { beforeEach, describe, expect, test } from "vitest";
import type { Attestation } from "../dist/src/proto/drp/object/v1/object_pb.js";
import { FinalityState, FinalityStore } from "../src/finality/index.js";
import { BitSet } from "../src/hashgraph/bitset.js";

describe("Tests for FinalityState", () => {
	let finalityState: FinalityState;
	let cred: Map<string, BlsSecretKey>;
	beforeEach(() => {
		cred = new Map();
		const voters = new Map();
		for (let i = 0; i < 128; i++) {
			cred.set(`node${i}`, bls.SecretKey.fromKeygen());
		}
		for (const [key, value] of cred) {
			voters.set(key, {
				ed25519PublicKey: "",
				blsPublicKey: uint8ArrayToString(
					value.toPublicKey().toBytes(),
					"base64",
				),
			});
		}
		finalityState = new FinalityState("vertex1", voters);
	});

	test("addVote: Nodes outside the voter set are rejected", async () => {
		const privateKey = bls.SecretKey.fromKeygen();

		const signature = privateKey
			.sign(uint8ArrayFromString(finalityState.data))
			.toBytes();

		expect(() => finalityState.addVote("badNode", signature)).toThrowError(
			"Peer not found in voter list",
		);
	});

	test("addVote: Bad signatures are rejected", async () => {
		const privateKey = bls.SecretKey.fromKeygen();

		const signature = privateKey
			.sign(uint8ArrayFromString(finalityState.data))
			.toBytes();

		expect(() => finalityState.addVote("node1", signature)).toThrowError(
			"Invalid signature",
		);
	});

	test("addVote: Votes are counted correctly", async () => {
		let count = 0;
		for (const [peerId, privateKey] of cred) {
			const signature = privateKey
				.sign(uint8ArrayFromString("vertex1"))
				.toBytes();
			finalityState.addVote(peerId, signature);
			count++;
			expect(finalityState.numberOfVotes).toEqual(count);
		}
		for (let i = 0; i < count; i++) {
			expect(finalityState.aggregation_bits.get(i)).toEqual(true);
		}
	});

	test("merge: Merge an aggregate of 100 votes", async () => {
		const signatures: Uint8Array[] = [];
		const bitset = new BitSet(20);
		for (let i = 0; i < 100; i++) {
			signatures.push(
				cred
					.get(`node${i}`)
					?.sign(uint8ArrayFromString("vertex1"))
					.toBytes() as Uint8Array,
			);
			bitset.set(finalityState.voterIndices.get(`node${i}`) as number, true);
		}
		const aggregatedSignature = bls.aggregateSignatures(signatures);
		const attestation = {
			data: "vertex1",
			signature: aggregatedSignature,
			aggregationBits: bitset.toBytes(),
		};
		await finalityState.merge(attestation);
		expect(finalityState.signature).toEqual(aggregatedSignature);
		expect(finalityState.numberOfVotes).toEqual(100);
	});
});

describe("Tests for FinalityStore", () => {
	let finalityStore: FinalityStore;
	let cred1: Map<string, BlsSecretKey>;
	let cred2: Map<string, BlsSecretKey>;

	beforeEach(() => {
		finalityStore = new FinalityStore({ finality_threshold: 0.51 });
		cred1 = new Map();
		const voters1 = new Map();
		for (let i = 0; i < 1000; i++) {
			cred1.set(`node${i}`, bls.SecretKey.fromKeygen());
		}
		for (const [key, value] of cred1) {
			voters1.set(key, {
				ed25519PublicKey: "",
				blsPublicKey: uint8ArrayToString(
					value.toPublicKey().toBytes(),
					"base64",
				),
			});
		}
		finalityStore.initializeState("vertex1", voters1);
		cred2 = new Map();
		const voters2 = new Map();
		for (let i = 0; i < 500; i++) {
			cred2.set(`node${i}`, bls.SecretKey.fromKeygen());
		}
		for (const [key, value] of cred1) {
			voters2.set(key, {
				ed25519PublicKey: "",
				blsPublicKey: uint8ArrayToString(
					value.toPublicKey().toBytes(),
					"base64",
				),
			});
		}
		finalityStore.initializeState("vertex2", voters2);
	});

	test("Runs addVotes, canVote and voted on 100 attestations", async () => {
		for (let i = 0; i < 100; i++) {
			expect(finalityStore.canVote(`node${i}`, "vertex1")).toEqual(true);
			expect(finalityStore.voted(`node${i}`, "vertex1")).toEqual(false);
			const attestation = {
				data: "vertex1",
				signature: cred1
					.get(`node${i}`)
					?.sign(uint8ArrayFromString("vertex1"))
					.toBytes() as Uint8Array,
			} as Attestation;
			finalityStore.addVotes(`node${i}`, [attestation]);
			expect(finalityStore.voted(`node${i}`, "vertex1")).toEqual(true);
		}
	});
});
