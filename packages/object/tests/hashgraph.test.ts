import { beforeEach, describe, expect, test } from "vitest";
import { AddWinsSet } from "../../blueprints/src/AddWinsSet/index.js";
import { PseudoRandomWinsSet } from "../../blueprints/src/PseudoRandomWinsSet/index.js";
import { DRPObject, type Operation, OperationType } from "../src/index.js";

describe("HashGraph construction tests", () => {
	let obj1: DRPObject;
	let obj2: DRPObject;

	beforeEach(async () => {
		obj1 = new DRPObject("peer1", new AddWinsSet<number>());
		obj2 = new DRPObject("peer2", new AddWinsSet<number>());
	});

	test("Test: Vertices are consistent across data structures", () => {
		expect(obj1.vertices).toEqual(obj1.hashGraph.getAllVertices());

		const drp1 = obj1.drp as AddWinsSet<number>;
		const drp2 = obj2.drp as AddWinsSet<number>;

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

	test("Test: HashGraph should be DAG compatibility", () => {
		/*
		        __ V1:ADD(1)
		  ROOT /
		       \__ V2:ADD(2)
		*/
		const drp1 = obj1.drp as AddWinsSet<number>;
		const drp2 = obj2.drp as AddWinsSet<number>;

		drp1.add(1);
		drp2.add(2);

		obj2.merge(obj1.hashGraph.getAllVertices());

		expect(obj2.hashGraph.selfCheckConstraints()).toBe(true);

		const linearOps = obj2.hashGraph.linearizeOperations();
		expect(linearOps).toEqual([
			{ type: "add", value: 1 },
			{ type: "add", value: 2 },
		]);
	});

	test("Test: HashGraph with 2 root vertices", () => {
		/*
		  ROOT -- V1:ADD(1)
		  FAKE_ROOT -- V2:ADD(1)
		*/
		const drp1 = obj1.drp as AddWinsSet<number>;
		drp1.add(1);
		// add fake root
		const hash = obj1.hashGraph.addVertex(
			{
				type: "root",
				value: null,
			},
			[],
			"",
			"",
		);
		obj1.hashGraph.addVertex(
			{
				type: "add",
				value: 1,
			},
			[hash],
			"",
			"",
		);
		expect(obj1.hashGraph.selfCheckConstraints()).toBe(false);

		const linearOps = obj1.hashGraph.linearizeOperations();
		expect(linearOps).toEqual([{ type: "add", value: 1 }]);
	});
});

describe("HashGraph for AddWinSet tests", () => {
	let obj1: DRPObject;
	let obj2: DRPObject;
	let obj3: DRPObject;

	beforeEach(async () => {
		obj1 = new DRPObject("peer1", new AddWinsSet<number>());
		obj2 = new DRPObject("peer2", new AddWinsSet<number>());
		obj3 = new DRPObject("peer3", new AddWinsSet<number>());
	});

	test("Test: Add Two Vertices", () => {
		/*
		  ROOT -- ADD(1) -- REMOVE(1)
		*/

		const drp1 = obj1.drp as AddWinsSet<number>;
		drp1.add(1);
		drp1.remove(1);
		expect(drp1.contains(1)).toBe(false);

		const linearOps = obj1.hashGraph.linearizeOperations();
		expect(linearOps).toEqual([
			{ type: "add", value: 1 },
			{ type: "remove", value: 1 },
		]);
	});

	test("Test: Add Two Concurrent Vertices With Same Value", () => {
		/*
		                     __ V2:REMOVE(1)
		  ROOT -- V1:ADD(1) /
		                    \__ V3:ADD(1)
		*/

		const drp1 = obj1.drp as AddWinsSet<number>;
		const drp2 = obj2.drp as AddWinsSet<number>;

		drp1.add(1);
		obj2.merge(obj1.hashGraph.getAllVertices());

		drp1.remove(1);
		drp2.add(1);
		obj1.merge(obj2.hashGraph.getAllVertices());
		obj2.merge(obj1.hashGraph.getAllVertices());

		expect(drp1.contains(1)).toBe(true);
		expect(obj1.hashGraph.vertices).toEqual(obj2.hashGraph.vertices);

		const linearOps = obj1.hashGraph.linearizeOperations();
		expect(linearOps).toEqual([
			{ type: "add", value: 1 },
			{ type: "add", value: 1 },
		]);
	});

	test("Test: Add Two Concurrent Vertices With Different Values", () => {
		/*
		                     __ V2:REMOVE(1)
		  ROOT -- V1:ADD(1) /
		                    \__ V3:ADD(2)
		*/

		const drp1 = obj1.drp as AddWinsSet<number>;
		const drp2 = obj2.drp as AddWinsSet<number>;

		drp1.add(1);
		obj2.merge(obj1.hashGraph.getAllVertices());

		drp1.remove(1);
		drp2.add(2);
		obj1.merge(obj2.hashGraph.getAllVertices());
		obj2.merge(obj1.hashGraph.getAllVertices());

		expect(drp1.contains(1)).toBe(false);
		expect(drp1.contains(2)).toBe(true);
		expect(obj1.hashGraph.vertices).toEqual(obj2.hashGraph.vertices);

		const linearOps = obj1.hashGraph.linearizeOperations();
		expect(linearOps).toEqual([
			{ type: "add", value: 1 },
			{ type: "add", value: 2 },
			{ type: "remove", value: 1 },
		]);
	});

	test("Test: Tricky Case", () => {
		/*
		                     __ V2:REMOVE(1) -- V4:ADD(10)
		  ROOT -- V1:ADD(1) /
		                    \__ V3:ADD(1) -- V5:REMOVE(5)
		*/

		const drp1 = obj1.drp as AddWinsSet<number>;
		const drp2 = obj2.drp as AddWinsSet<number>;

		drp1.add(1);
		obj2.merge(obj1.hashGraph.getAllVertices());

		drp1.remove(1);
		drp2.add(1);
		drp1.add(10);
		drp2.remove(5);
		obj1.merge(obj2.hashGraph.getAllVertices());
		obj2.merge(obj1.hashGraph.getAllVertices());

		expect(drp1.contains(1)).toBe(true);
		expect(drp1.contains(10)).toBe(true);
		expect(drp1.contains(5)).toBe(false);
		expect(obj1.hashGraph.vertices).toEqual(obj2.hashGraph.vertices);

		const linearOps = obj1.hashGraph.linearizeOperations();
		expect(linearOps).toEqual([
			{ type: "add", value: 1 },
			{ type: "add", value: 1 },
			{ type: "remove", value: 5 },
			{ type: "add", value: 10 },
		]);
	});

	test("Test: Yuta Papa's Case", () => {
		/*
		                     __ V2:REMOVE(1) -- V4:ADD(2)
		  ROOT -- V1:ADD(1) /
		                    \__ V3:REMOVE(2) -- V5:ADD(1)
		*/

		const drp1 = obj1.drp as AddWinsSet<number>;
		const drp2 = obj2.drp as AddWinsSet<number>;

		drp1.add(1);
		obj2.merge(obj1.hashGraph.getAllVertices());

		drp1.remove(1);
		drp2.remove(2);
		drp1.add(2);
		drp2.add(1);
		obj1.merge(obj2.hashGraph.getAllVertices());
		obj2.merge(obj1.hashGraph.getAllVertices());

		expect(drp1.contains(1)).toBe(true);
		expect(drp1.contains(2)).toBe(true);
		expect(obj1.hashGraph.vertices).toEqual(obj2.hashGraph.vertices);

		const linearOps = obj1.hashGraph.linearizeOperations();
		expect(linearOps).toEqual([
			{ type: "add", value: 1 },
			{ type: "add", value: 1 },
			{ type: "add", value: 2 },
		]);
	});

	test("Test: Mega Complex Case", () => {
		/*
		                                              __ V6:ADD(3)
		                                             /
		                    ___ V2:ADD(1) -- V3:RM(2) -- V7:RM(1) --- V8:RM(3)
		                   /                                         /
		                  /                           ______________/
		  ROOT -- V1:ADD(1)                          /
		                  \                         /
		                   \__ V4:RM(2) -- V5:ADD(2) -- V9:RM(1)
		*/

		const drp1 = obj1.drp as AddWinsSet<number>;
		const drp2 = obj2.drp as AddWinsSet<number>;
		const drp3 = obj3.drp as AddWinsSet<number>;

		drp1.add(1);
		obj2.merge(obj1.hashGraph.getAllVertices());

		drp1.add(1);
		drp1.remove(2);
		drp2.remove(2);
		drp2.add(2);

		obj3.merge(obj1.hashGraph.getAllVertices());
		drp3.add(3);
		drp1.remove(1);

		obj1.merge(obj2.hashGraph.getAllVertices());
		drp1.remove(3);
		drp2.remove(1);

		obj1.merge(obj2.hashGraph.getAllVertices());
		obj1.merge(obj3.hashGraph.getAllVertices());
		obj2.merge(obj1.hashGraph.getAllVertices());
		obj2.merge(obj3.hashGraph.getAllVertices());
		obj3.merge(obj1.hashGraph.getAllVertices());
		obj3.merge(obj2.hashGraph.getAllVertices());

		expect(drp1.contains(1)).toBe(false);
		expect(drp1.contains(2)).toBe(true);
		expect(drp1.contains(3)).toBe(true);
		expect(obj1.hashGraph.vertices).toEqual(obj2.hashGraph.vertices);
		expect(obj1.hashGraph.vertices).toEqual(obj3.hashGraph.vertices);

		const linearOps = obj1.hashGraph.linearizeOperations();
		expect(linearOps).toEqual([
			{ type: "add", value: 1 },
			{ type: "remove", value: 2 },
			{ type: "add", value: 2 },
			{ type: "add", value: 1 },
			{ type: "add", value: 3 },
			{ type: "remove", value: 1 },
		]);
	});

	test("Test: Mega Complex Case 1", () => {
		/*
		                                                __ V5:ADD(3)
		                                               /
		                     ___  V2:ADD(1) -- V3:RM(2) -- V6:RM(1) -- V8:RM(3)
		                    /                                      \
		                   /                                        \
		  ROOT -- V1:ADD(1)                                          \
		                   \                                          \
		                    \__ V4:RM(2) ----------------------------- V7:ADD(2) -- V9:RM(1)
		*/

		const drp1 = obj1.drp as AddWinsSet<number>;
		const drp2 = obj2.drp as AddWinsSet<number>;
		const drp3 = obj3.drp as AddWinsSet<number>;

		drp1.add(1);
		obj2.merge(obj1.hashGraph.getAllVertices());

		drp1.add(1);
		drp1.remove(2);
		drp2.remove(2);

		obj3.merge(obj1.hashGraph.getAllVertices());
		drp3.add(3);
		drp1.remove(1);

		obj2.merge(obj1.hashGraph.getAllVertices());
		drp2.add(2);
		drp1.remove(3);
		drp2.remove(1);

		obj1.merge(obj2.hashGraph.getAllVertices());
		obj1.merge(obj3.hashGraph.getAllVertices());
		obj2.merge(obj1.hashGraph.getAllVertices());
		obj2.merge(obj3.hashGraph.getAllVertices());
		obj3.merge(obj1.hashGraph.getAllVertices());
		obj3.merge(obj2.hashGraph.getAllVertices());

		expect(drp1.contains(1)).toBe(false);
		expect(drp1.contains(2)).toBe(true);
		expect(drp1.contains(3)).toBe(true);
		expect(obj1.hashGraph.vertices).toEqual(obj2.hashGraph.vertices);
		expect(obj1.hashGraph.vertices).toEqual(obj3.hashGraph.vertices);

		const linearOps = obj1.hashGraph.linearizeOperations();
		expect(linearOps).toEqual([
			{ type: "add", value: 1 },
			{ type: "remove", value: 2 },
			{ type: "add", value: 1 },
			{ type: "remove", value: 2 },
			{ type: "add", value: 3 },
			{ type: "remove", value: 1 },
			{ type: "add", value: 2 },
			{ type: "remove", value: 1 },
		]);
	});

	test("Test: Joao's latest brain teaser", () => {
		/*
		                     __ V2:ADD(2) -------------\
		  ROOT -- V1:ADD(1) /                           \ V5:RM(2)
		                    \__ V3:RM(2) -- V4:RM(2) --/
		*/

		const drp1 = obj1.drp as AddWinsSet<number>;
		const drp2 = obj2.drp as AddWinsSet<number>;

		drp1.add(1);
		obj2.merge(obj1.hashGraph.getAllVertices());

		drp1.add(2);
		drp2.remove(2);
		drp2.remove(2);
		obj1.merge(obj2.hashGraph.getAllVertices());
		obj2.merge(obj1.hashGraph.getAllVertices());

		drp1.remove(2);
		obj2.merge(obj1.hashGraph.getAllVertices());

		expect(drp1.contains(1)).toBe(true);
		expect(drp1.contains(2)).toBe(false);
		expect(obj1.hashGraph.vertices).toEqual(obj2.hashGraph.vertices);

		const linearOps = obj1.hashGraph.linearizeOperations();
		expect(linearOps).toEqual([
			{ type: "add", value: 1 },
			{ type: "add", value: 2 },
			{ type: "remove", value: 2 },
		]);
	});
});

describe("HashGraph for PseudoRandomWinsSet tests", () => {
	let obj1: DRPObject;
	let obj2: DRPObject;
	let obj3: DRPObject;
	let obj4: DRPObject;
	let obj5: DRPObject;

	beforeEach(async () => {
		obj1 = new DRPObject("peer1", new PseudoRandomWinsSet<number>());
		obj2 = new DRPObject("peer2", new PseudoRandomWinsSet<number>());
		obj3 = new DRPObject("peer3", new PseudoRandomWinsSet<number>());
		obj4 = new DRPObject("peer4", new PseudoRandomWinsSet<number>());
		obj5 = new DRPObject("peer5", new PseudoRandomWinsSet<number>());
	});

	test("Test: Many concurrent operations", () => {
		/*
		        /-- V1:ADD(1)
		       /--- V2:ADD(2)
		  ROOT -- V3:ADD(3)
		       \__  V4:ADD(4)
		        \__ V5:ADD(5)
		*/

		const drp1 = obj1.drp as PseudoRandomWinsSet<number>;
		const drp2 = obj2.drp as PseudoRandomWinsSet<number>;
		const drp3 = obj3.drp as PseudoRandomWinsSet<number>;
		const drp4 = obj4.drp as PseudoRandomWinsSet<number>;
		const drp5 = obj5.drp as PseudoRandomWinsSet<number>;

		drp1.add(1);
		drp2.add(2);
		drp3.add(3);
		drp4.add(4);
		drp5.add(5);

		obj2.merge(obj1.hashGraph.getAllVertices());
		obj3.merge(obj2.hashGraph.getAllVertices());
		obj4.merge(obj3.hashGraph.getAllVertices());
		obj5.merge(obj4.hashGraph.getAllVertices());
		obj1.merge(obj5.hashGraph.getAllVertices());

		const linearOps = obj1.hashGraph.linearizeOperations();
		// Pseudo-randomly chosen operation
		expect(linearOps).toEqual([{ type: "add", value: 3 }]);
	});
});

describe("HashGraph for undefined operations tests", () => {
	let obj1: DRPObject;
	let obj2: DRPObject;

	beforeEach(async () => {
		obj1 = new DRPObject("peer1", new AddWinsSet<number>());
		obj2 = new DRPObject("peer2", new AddWinsSet<number>());
	});

	test("Test: merge should skip undefined operations", () => {
		const drp1 = obj1.drp as AddWinsSet<number>;
		const drp2 = obj2.drp as AddWinsSet<number>;

		drp1.add(1);
		drp2.add(2);

		// Set one of the vertice from drp1 to have undefined operation
		obj1.hashGraph.getAllVertices()[1].operation = undefined;

		obj2.merge(obj1.hashGraph.getAllVertices());

		const linearOps = obj2.hashGraph.linearizeOperations();
		// Should only have one, since we skipped the undefined operations
		expect(linearOps).toEqual([{ type: "add", value: 2 }]);
	});

	test("Test: addToFrontier with undefined operation return Vertex with NoOp operation", () => {
		// Forcefully pass an undefined value
		const createdVertex = obj1.hashGraph.addToFrontier(
			undefined as unknown as Operation,
		);

		expect(createdVertex.operation).toEqual({
			type: OperationType.NOP,
		} as Operation);
	});
});

describe("Vertex state tests", () => {
	let obj1: DRPObject;
	let obj2: DRPObject;
	let obj3: DRPObject;

	beforeEach(async () => {
		obj1 = new DRPObject("peer1", new AddWinsSet<number>());
		obj2 = new DRPObject("peer2", new AddWinsSet<number>());
		obj3 = new DRPObject("peer3", new AddWinsSet<number>());
	});

	test("Test: Vertex states work correctly with single HashGraph", () => {
		/*
		  ROOT -- V1:ADD(1) -- V2:ADD(2) -- V3:ADD(3)
		*/
		const drp1 = obj1.drp as AddWinsSet<number>;

		drp1.add(1);
		drp1.add(2);
		drp1.add(3);

		const vertices = obj1.hashGraph.topologicalSort();

		const drpState1 = obj1.states.get(vertices[1]);
		expect(drpState1?.state.get("state").get(1)).toBe(true);
		expect(drpState1?.state.get("state").get(2)).toBe(undefined);
		expect(drpState1?.state.get("state").get(3)).toBe(undefined);

		const drpState2 = obj1.states.get(vertices[2]);
		expect(drpState2?.state.get("state").get(1)).toBe(true);
		expect(drpState2?.state.get("state").get(2)).toBe(true);
		expect(drpState2?.state.get("state").get(3)).toBe(undefined);

		const drpState3 = obj1.states.get(vertices[3]);
		expect(drpState3?.state.get("state").get(1)).toBe(true);
		expect(drpState3?.state.get("state").get(2)).toBe(true);
		expect(drpState3?.state.get("state").get(3)).toBe(true);
	});

	test("Test: Tricky merging", () => {
		/*
		        __ V1:ADD(1) ------ V4:ADD(4) __
		       /                   /            \
		  ROOT -- V2:ADD(2) ------/              \ V6:ADD(6)
		       \                   \            /
		        -- V3:ADD(3) ------ V5:ADD(5) --
		*/

		// in above hashgraph, A represents drp1, B represents drp2, C represents drp3
		const drp1 = obj1.drp as AddWinsSet<number>;
		const drp2 = obj2.drp as AddWinsSet<number>;
		const drp3 = obj3.drp as AddWinsSet<number>;

		drp1.add(1);
		drp2.add(2);
		drp3.add(3);

		obj1.merge(obj2.hashGraph.getAllVertices());
		obj3.merge(obj2.hashGraph.getAllVertices());

		drp1.add(4);
		drp3.add(5);

		obj1.merge(obj3.hashGraph.getAllVertices());
		obj3.merge(obj1.hashGraph.getAllVertices());

		drp1.add(6);

		const hashA4 =
			"8e6f4369010528ae3668efce452da04d077e0957955d62d671b90f2934c755fe";
		const hashC5 =
			"a8d94f7e2b421be2d5cd1124ca9ddb831e38246065db6e9a32ce493ca9604038";
		const hashA6 =
			"cd6a955f0734a09df1bff44c5e0458365d3a26ec7f1cae0df2c0f708b9f100a8";

		const drpState1 = obj1.states.get(hashA4);
		expect(drpState1?.state.get("state").get(1)).toBe(true);
		expect(drpState1?.state.get("state").get(2)).toBe(true);
		expect(drpState1?.state.get("state").get(3)).toBe(undefined);
		expect(drpState1?.state.get("state").get(4)).toBe(true);
		expect(drpState1?.state.get("state").get(5)).toBe(undefined);

		const drpState2 = obj1.states.get(hashC5);
		expect(drpState2?.state.get("state").get(1)).toBe(undefined);
		expect(drpState2?.state.get("state").get(2)).toBe(true);
		expect(drpState2?.state.get("state").get(3)).toBe(true);
		expect(drpState2?.state.get("state").get(4)).toBe(undefined);
		expect(drpState2?.state.get("state").get(5)).toBe(true);

		const drpState3 = obj1.states.get(hashA6);
		expect(drpState3?.state.get("state").get(1)).toBe(true);
		expect(drpState3?.state.get("state").get(2)).toBe(true);
		expect(drpState3?.state.get("state").get(3)).toBe(true);
		expect(drpState3?.state.get("state").get(4)).toBe(true);
		expect(drpState3?.state.get("state").get(5)).toBe(true);
		expect(drpState3?.state.get("state").get(6)).toBe(true);
	});

	test("Test: Vertex states with mega complex case", () => {
		/*
		                                               __ V6:ADD(3)
		                                              /
		                     ___ V2:ADD(1) -- V3:RM(2) -- V7:RM(1) ------ V8:RM(3)
		                    /                                            /
		                   /                           _________________/
		  ROOT -- V1:ADD(1)                           /
		                   \                         /
		                    \__ V4:RM(2) -- V5:ADD(2) -- V9:RM(1)
		*/

		const drp1 = obj1.drp as AddWinsSet<number>;
		const drp2 = obj2.drp as AddWinsSet<number>;
		const drp3 = obj3.drp as AddWinsSet<number>;

		drp1.add(1);
		obj2.merge(obj1.hashGraph.getAllVertices());

		drp1.add(1);
		drp1.remove(2);
		drp2.remove(2);
		drp2.add(2);

		obj3.merge(obj1.hashGraph.getAllVertices());
		drp3.add(3);
		drp1.remove(1);

		obj1.merge(obj2.hashGraph.getAllVertices());
		drp1.remove(3);
		drp2.remove(1);

		obj1.merge(obj2.hashGraph.getAllVertices());
		obj1.merge(obj3.hashGraph.getAllVertices());
		obj2.merge(obj1.hashGraph.getAllVertices());
		obj2.merge(obj3.hashGraph.getAllVertices());
		obj3.merge(obj1.hashGraph.getAllVertices());
		obj3.merge(obj2.hashGraph.getAllVertices());

		const hashV8 =
			"be97d8fe9169800893c28b3d8aaefda517b98936efb069673e0250317b5e4a0b";
		const drpStateV8 = obj1.states.get(hashV8);
		expect(drpStateV8?.state.get("state").get(1)).toBe(false);
		expect(drpStateV8?.state.get("state").get(2)).toBe(true);
		expect(drpStateV8?.state.get("state").get(3)).toBe(undefined);
	});
});
