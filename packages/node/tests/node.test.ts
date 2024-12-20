import { AddWinsSetWithACL } from "@topology-foundation/blueprints/src/AddWinsSetWithACL/index.js";
import { type DRP, DRPObject } from "@ts-drp/object";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import {
	signGeneratedVertices,
	verifyIncomingVertices,
} from "../src/handlers.js";
import { DRPNode, type DRPNodeConfig } from "../src/index.js";

describe("DPRNode with verify and sign signature", () => {
	let drp: DRP;
	let drpNode: DRPNode;
	let drpObject: DRPObject;
	let config: DRPNodeConfig;
	beforeAll(async () => {
		config = {
			network_config: {
				private_key_seed: "cdc4c01bb5869c7497a80c5ae06afba6",
			},
		};
		drpNode = new DRPNode(config);
		await drpNode.start();
	});

	beforeEach(async () => {
		drp = new AddWinsSetWithACL(
			new Map([
				[drpNode.networkNode.peerId, drpNode.networkNode.publicKey || ""],
			]),
		);
		drpObject = new DRPObject(drpNode.networkNode.peerId, drp);
	});

	test("Node will not sign vertex if it is not the creator", async () => {
		const vertices = [
			{
				hash: "hash",
				nodeId: "nodeId",
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
				nodeId: drpNode.networkNode.peerId,
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
				nodeId: drpNode.networkNode.peerId,
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
				nodeId: "peer1",
				operation: {
					type: "add",
					value: 1,
				},
				dependencies: [],
				signature: "",
			},
		];

		const drp1 = new AddWinsSetWithACL();
		const drpObject1 = new DRPObject("peer1", drp1);
		const verifiedVertices = await verifyIncomingVertices(drpObject1, vertices);
		expect(verifiedVertices.length).toBe(1);
	});

	test("Ignore vertex if the signature is invalid", async () => {
		const vertices = [
			{
				hash: "hash",
				nodeId: drpNode.networkNode.peerId,
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
