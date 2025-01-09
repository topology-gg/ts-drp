import { AddWinsSetWithACL } from "@topology-foundation/blueprints/src/AddWinsSetWithACL/index.js";
import { AddWinsSet } from "@topology-foundation/blueprints/src/index.js";
import { type DRP, DRPObject, type Vertex } from "@ts-drp/object";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import {
	signGeneratedVertices,
	verifyIncomingVertices,
	voteGeneratedVertices,
} from "../src/handlers.js";
import { DRPNode, type DRPNodeConfig } from "../src/index.js";
import { DRPCredentialStore } from "../src/store/index.js";

describe("DPRNode with verify and sign signature", () => {
	let drp: DRP;
	let drpNode: DRPNode;
	let drpObject: DRPObject;
	let config: DRPNodeConfig;
	beforeAll(async () => {
		drpNode = new DRPNode();
		await drpNode.start();
	});

	beforeEach(async () => {
		drp = new AddWinsSetWithACL(
			new Map([
				[
					drpNode.networkNode.peerId,
					drpNode.credentialStore.getPublicCredential(),
				],
			]),
		);
		drpObject = new DRPObject(drpNode.networkNode.peerId, drp);
	});

	test("Node will not sign vertex if it is not the creator", async () => {
		const vertices = [
			{
				hash: "hash",
				peerId: "peerId",
				operation: {
					type: "type",
					value: "value",
				},
				dependencies: [],
				signature: "",
			},
		];
		await signGeneratedVertices(drpNode, vertices);
		expect(vertices[0].signature).toBe("");
	});

	test("Node will sign vertex if it is the creator", async () => {
		const vertices = [
			{
				hash: "hash",
				peerId: drpNode.networkNode.peerId,
				operation: {
					type: "add",
					value: 1,
				},
				dependencies: [],
				signature: "",
			},
		];
		await signGeneratedVertices(drpNode, vertices);
		expect(vertices[0].signature).not.toBe("");
	});

	test("Verify incoming vertices", async () => {
		const vertices = [
			{
				hash: "hash",
				peerId: drpNode.networkNode.peerId,
				operation: {
					type: "add",
					value: 1,
				},
				dependencies: [],
				signature: "",
			},
		];
		await signGeneratedVertices(drpNode, vertices);
		const verifiedVertices = await verifyIncomingVertices(drpObject, vertices);
		expect(verifiedVertices.length).toBe(1);
	});

	test("Blind merge if the acl is undefined", async () => {
		const vertices = [
			{
				hash: "hash",
				peerId: "peer1",
				operation: {
					type: "add",
					value: 1,
				},
				dependencies: [],
				signature: "",
			},
		];

		const drp1 = new AddWinsSet();
		const drpObject1 = new DRPObject("peer1", drp1);
		const verifiedVertices = await verifyIncomingVertices(drpObject1, vertices);
		expect(verifiedVertices.length).toBe(1);
	});

	test("Ignore vertex if the signature is invalid", async () => {
		const vertices = [
			{
				hash: "hash",
				peerId: drpNode.networkNode.peerId,
				operation: {
					type: "add",
					value: 1,
				},
				dependencies: [],
				signature: "",
			},
		];
		const verifiedVertices = await verifyIncomingVertices(drpObject, vertices);
		expect(verifiedVertices.length).toBe(0);
	});
});

describe("DRPNode voting tests", () => {
	let drp: AddWinsSetWithACL<number>;
	let drpNode: DRPNode;
	let drpObject: DRPObject;
	let adminCredentialStore: DRPCredentialStore;

	beforeAll(async () => {
		drpNode = new DRPNode();
		adminCredentialStore = new DRPCredentialStore();
		await drpNode.start();
		await adminCredentialStore.start();
	});

	beforeEach(async () => {
		drpObject = new DRPObject(
			drpNode.networkNode.peerId,
			new AddWinsSetWithACL(
				new Map([["admin", adminCredentialStore.getPublicCredential()]]),
			),
		);
		drp = drpObject.drp as AddWinsSetWithACL<number>;
	});

	test("Nodes in writer set are able to vote", async () => {
		/*
		  ROOT -- GRANT(A) ---- A:ADD(1)
		*/

		drp.acl.grant(
			"admin",
			drpNode.networkNode.peerId,
			drpNode.credentialStore.getPublicCredential(),
		);
		drp.add(1);

		const V1 = drpObject.vertices.find(
			(v) => v.operation?.value === 1,
		) as Vertex;

		expect(V1 !== undefined).toBe(true);

		await voteGeneratedVertices(drpNode, drpObject, [V1]);

		expect(
			drpObject.finalityStore.canVote(drpNode.networkNode.peerId, V1.hash),
		).toBe(true);

		expect(drpObject.finalityStore.getAttestation(V1.hash)?.signature).toEqual(
			drpNode.credentialStore.signWithBls(V1.hash),
		);
	});

	test("Other nodes are not able to vote", async () => {
		/*
		  ROOT -- GRANT(A) ---- A:ADD(1) ---- REVOKE(A) ---- A:ADD(2)
		*/

		drp.acl.grant(
			"admin",
			drpNode.networkNode.peerId,
			drpNode.credentialStore.getPublicCredential(),
		);
		drp.add(1);
		drp.acl.revoke("admin", drpNode.networkNode.peerId);
		drp.add(2);

		const V2 = drpObject.vertices.find(
			(v) => v.operation?.value === 2,
		) as Vertex;

		expect(V2 !== undefined).toBe(true);

		await voteGeneratedVertices(drpNode, drpObject, [V2]);

		expect(
			drpObject.finalityStore.canVote(drpNode.networkNode.peerId, V2.hash),
		).toBe(false);

		expect(
			drpObject.finalityStore.getAttestation(V2.hash)?.signature,
		).toBeUndefined();
	});
});
