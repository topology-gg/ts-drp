import { beforeEach, describe, expect, test } from "vitest";
import { AddWinsSetWithACL } from "../../blueprints/src/AddWinsSetWithACL/index.js";
import { type Operation, OperationType, TopologyObject } from "../src/index.js";

describe("HashGraph construction tests", () => {
	let obj1: TopologyObject;
	let obj2: TopologyObject;

	beforeEach(async () => {
		obj1 = new TopologyObject("peer1", new AddWinsSetWithACL<number>(["peer1"]));
		obj2 = new TopologyObject("peer2", new AddWinsSetWithACL<number>(["peer1"]));
	});

	test("Test: HashGraph should be DAG compatibility", () => {
		const cro1 = obj1.cro as AddWinsSetWithACL<number>;
		const cro2 = obj2.cro as AddWinsSetWithACL<number>;

		cro1.add(1);
		cro2.add(2);

		obj2.merge(obj1.hashGraph.getAllVertices());

		expect(obj2.hashGraph.selfCheckConstraints()).toBe(true);

		const linearOps = obj2.hashGraph.linearizeOperations();
		expect(linearOps).toEqual([
			{ type: "add", value: 1 },
			{ type: "add", value: 2 },
		]);
	});
});
