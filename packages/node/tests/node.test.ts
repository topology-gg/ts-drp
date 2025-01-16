import bls from "@chainsafe/bls/herumi";
import { AddWinsSet } from "@ts-drp/blueprints";
import { ACL } from "@ts-drp/object";
import { type DRP, DRPObject, DrpType, type Vertex } from "@ts-drp/object";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import {
	signFinalityVertices,
	signGeneratedVertices,
	verifyIncomingVertices,
} from "../src/handlers.js";
import { DRPNode } from "../src/index.js";

describe("DPRNode with verify and sign signature", () => {
	let drp: DRP;
	let drpNode: DRPNode;
	let drpObject: DRPObject;
	beforeAll(async () => {
		drpNode = new DRPNode();
		await drpNode.start();
	});

	beforeEach(async () => {
		drp = new AddWinsSet();
		const acl = new ACL(
			new Map([
				[
					drpNode.networkNode.peerId,
					drpNode.credentialStore.getPublicCredential(),
				],
			]),
		);
		drpObject = new DRPObject(drpNode.networkNode.peerId, undefined, acl, drp);
	});

	test("Node will not sign vertex if it is not the creator", async () => {
		const vertices = [
			{
				hash: "hash",
				peerId: "peerId",
				operation: {
					type: "type",
					value: "value",
					vertexType: DrpType.DRP,
				},
				dependencies: [],
				timestamp: Date.now(),
				signature: new Uint8Array(),
			},
		];
		await signGeneratedVertices(drpNode, vertices);
		expect(vertices[0].signature.length).toBe(0);
	});

	test("Node will sign vertex if it is the creator", async () => {
		const vertices = [
			{
				hash: "hash",
				peerId: drpNode.networkNode.peerId,
				operation: {
					type: "add",
					value: [1],
					vertexType: DrpType.DRP,
				},
				dependencies: [],
				timestamp: Date.now(),
				signature: new Uint8Array(),
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
					opType: "add",
					value: [1],
					vertexType: DrpType.DRP,
				},
				dependencies: [],
				timestamp: Date.now(),
				signature: new Uint8Array(),
			},
		];
		await signGeneratedVertices(drpNode, vertices);
		const verifiedVertices = await verifyIncomingVertices(drpObject, vertices);
		expect(verifiedVertices.length).toBe(1);
	});

	test("Ignore vertex if the signature is invalid", async () => {
		const vertices = [
			{
				hash: "hash",
				peerId: drpNode.networkNode.peerId,
				operation: {
					type: "add",
					value: [1],
					vertexType: DrpType.DRP,
				},
				dependencies: [],
				timestamp: Date.now(),
				signature: new Uint8Array(),
			},
		];
		const verifiedVertices = await verifyIncomingVertices(drpObject, vertices);
		expect(verifiedVertices.length).toBe(0);
	});
});

describe("DRPNode voting tests", () => {
	let drp1: AddWinsSet<number>;
	let acl1: ACL;
	let nodeA: DRPNode;
	let nodeB: DRPNode;
	let obj1: DRPObject;
	let obj2: DRPObject;

	beforeAll(async () => {
		nodeA = new DRPNode();
		nodeB = new DRPNode();
		await nodeA.start();
		await nodeB.start();
	});

	beforeEach(async () => {
		obj1 = new DRPObject(
			nodeA.networkNode.peerId,
			nodeA.credentialStore.getPublicCredential(),
			undefined,
			new AddWinsSet(),
		);
		drp1 = obj1.drp as AddWinsSet<number>;
		acl1 = obj1.acl as ACL;
		obj2 = new DRPObject(
			nodeB.networkNode.peerId,
			undefined,
			acl1,
			new AddWinsSet(),
		);
	});

	test("Nodes in writer set are able to sign", async () => {
		/*
		  ROOT -- A:GRANT(B) ---- B:ADD(1)
		*/

		console.log("obj1", obj1);
		console.log("acl1", acl1);

		acl1.grant(
			nodeA.networkNode.peerId,
			nodeB.networkNode.peerId,
			nodeB.credentialStore.getPublicCredential(),
		);
		drp1.add(1);

		obj2.merge(obj1.vertices);
		const V1 = obj2.vertices.find(
			(v) => v.operation?.value !== null && v.operation?.value[0] === 1,
		) as Vertex;
		expect(V1 !== undefined).toBe(true);

		signFinalityVertices(nodeB, obj2, [V1]);

		expect(obj2.finalityStore.canSign(nodeB.networkNode.peerId, V1.hash)).toBe(
			true,
		);
		expect(obj2.finalityStore.getAttestation(V1.hash)?.signature).toEqual(
			nodeB.credentialStore.signWithBls(V1.hash),
		);
		expect(obj2.finalityStore.getNumberOfSignatures(V1.hash)).toBe(1);
	});

	test("Other nodes are not able to sign", async () => {
		/*
		  ROOT -- A:GRANT(B) ---- B:ADD(1) ---- A:REVOKE(B) ---- B:ADD(2)
		*/

		acl1.grant(
			nodeA.networkNode.peerId,
			nodeB.networkNode.peerId,
			nodeB.credentialStore.getPublicCredential(),
		);
		drp1.add(1);
		acl1.revoke(nodeA.networkNode.peerId, nodeB.networkNode.peerId);
		drp1.add(2);

		obj2.merge(obj1.vertices);
		const V2 = obj2.vertices.find(
			(v) => v.operation?.value !== null && v.operation?.value[0] === 2,
		) as Vertex;
		expect(V2 !== undefined).toBe(true);

		signFinalityVertices(nodeB, obj2, [V2]);

		expect(obj2.finalityStore.canSign(nodeB.networkNode.peerId, V2.hash)).toBe(
			false,
		);

		expect(
			obj2.finalityStore.getAttestation(V2.hash)?.signature,
		).toBeUndefined();
		expect(obj2.finalityStore.getNumberOfSignatures(V2.hash)).toBe(0);
	});

	test("Signatures are aggregated", async () => {
		/*
		  ROOT -- A:GRANT(B) ---- B:ADD(1)
		*/

		acl1.grant(
			nodeA.networkNode.peerId,
			nodeB.networkNode.peerId,
			nodeB.credentialStore.getPublicCredential(),
		);
		drp1.add(1);

		obj2.merge(obj1.vertices);
		const V1 = obj2.vertices.find(
			(v) => v.operation?.value !== null && v.operation?.value[0] === 1,
		) as Vertex;
		expect(V1 !== undefined).toBe(true);

		signFinalityVertices(nodeA, obj2, [V1]);
		expect(obj2.finalityStore.getNumberOfSignatures(V1.hash)).toBe(1);

		signFinalityVertices(nodeB, obj2, [V1]);
		expect(obj2.finalityStore.getNumberOfSignatures(V1.hash)).toBe(2);
		expect(obj2.finalityStore.getAttestation(V1.hash)?.signature).toEqual(
			bls.aggregateSignatures([
				nodeA.credentialStore.signWithBls(V1.hash),
				nodeB.credentialStore.signWithBls(V1.hash),
			]),
		);
	});
});
