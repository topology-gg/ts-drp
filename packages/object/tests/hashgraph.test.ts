import { SetDRP } from "@ts-drp/blueprints/src/Set/index.js";
import { beforeEach, describe, expect, test } from "vitest";

import { ObjectACL } from "../src/acl/index.js";
import { DRPObject, DrpType, type Operation } from "../src/index.js";

const acl = new ObjectACL({
	admins: new Map([
		["peer1", { ed25519PublicKey: "pubKey1", blsPublicKey: "pubKey1" }],
		["peer2", { ed25519PublicKey: "pubKey2", blsPublicKey: "pubKey2" }],
		["peer3", { ed25519PublicKey: "pubKey3", blsPublicKey: "pubKey3" }],
	]),
});

describe("HashGraph construction tests", () => {
	let obj1: DRPObject;
	let obj2: DRPObject;

	beforeEach(async () => {
		obj1 = new DRPObject({ peerId: "peer1", acl, drp: new SetDRP<number>() });
		obj2 = new DRPObject({ peerId: "peer2", acl, drp: new SetDRP<number>() });
	});

	test("Test: Vertices are consistent across data structures", () => {
		expect(obj1.vertices).toEqual(obj1.hashGraph.getAllVertices());

		const drp1 = obj1.drp as SetDRP<number>;
		const drp2 = obj2.drp as SetDRP<number>;

		for (let i = 0; i < 100; i++) {
			drp1.add(i);
			expect(obj1.vertices).toEqual(obj1.hashGraph.getAllVertices());
		}

		for (let i = 0; i < 100; i++) {
			drp2.add(i);
		}

		obj1.merge(obj2.hashGraph.getAllVertices());
		expect(obj1.vertices).toEqual(obj1.hashGraph.getAllVertices());
	});

	test("Test: HashGraph should be DAG compatible", () => {
		/*
		        __ V1:ADD(1)
		  ROOT /
		       \__ V2:ADD(2)
		*/
		const drp1 = obj1.drp as SetDRP<number>;
		const drp2 = obj2.drp as SetDRP<number>;

		drp1.add(1);
		drp2.add(2);
		obj2.merge(obj1.hashGraph.getAllVertices());

		expect(obj2.hashGraph.selfCheckConstraints()).toBe(true);

		const linearOps = obj2.hashGraph.linearizeOperations();
		expect(linearOps).toEqual([
			{ opType: "add", value: [2], drpType: DrpType.DRP },
			{ opType: "add", value: [1], drpType: DrpType.DRP },
		] as Operation[]);
	});

	test("Test: HashGraph with 2 root vertices", () => {
		/*
		  ROOT -- V1:ADD(1)
		  FAKE_ROOT -- V2:ADD(1)
		*/
		const drp1 = obj1.drp as SetDRP<number>;
		drp1.add(1);
		// add fake root
		obj1.hashGraph.addVertex({
			hash: "hash1",
			peerId: "peer1",
			operation: {
				opType: "root",
				value: null,
				drpType: DrpType.DRP,
			},
			dependencies: [],
			timestamp: Date.now(),
			signature: new Uint8Array(),
		});
		obj1.hashGraph.addVertex({
			hash: "hash2",
			peerId: "peer1",
			operation: {
				opType: "add",
				value: [1],
				drpType: DrpType.DRP,
			},
			dependencies: ["hash1"],
			timestamp: Date.now(),
			signature: new Uint8Array(),
		});
		expect(obj1.hashGraph.selfCheckConstraints()).toBe(false);

		const linearOps = obj1.hashGraph.linearizeOperations();
		const expectedOps: Operation[] = [{ opType: "add", value: [1], drpType: DrpType.DRP }];
		expect(linearOps).toEqual(expectedOps);
	});
});
