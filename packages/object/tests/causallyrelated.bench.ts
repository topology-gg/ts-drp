import type { ACL } from "@topology-foundation/blueprints/src/ACL/index.js";
import { bench, describe } from "vitest";

import { AddWinsSet } from "../../blueprints/src/AddWinsSet/index.js";
import { DRPObject, type Hash } from "../src/index.js";

describe("AreCausallyDependent benchmark", async () => {
	const samples = 100000;
	const tests: Hash[][] = [];

	const obj1 = new DRPObject("peer1", new AddWinsSet<number>(), null as unknown as ACL);
	const obj2 = new DRPObject("peer2", new AddWinsSet<number>(), null as unknown as ACL);
	const obj3 = new DRPObject("peer3", new AddWinsSet<number>(), null as unknown as ACL);

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

	const vertices = obj1.hashGraph.getAllVertices();
	for (let i = 0; i < samples; i++) {
		tests.push([
			vertices[Math.floor(Math.random() * vertices.length)].hash,
			vertices[Math.floor(Math.random() * vertices.length)].hash,
		]);
	}

	bench("Causality check using BFS", async () => {
		for (let i = 0; i < samples; i++) {
			obj1.hashGraph.areCausallyRelatedUsingBFS(tests[i][0], tests[i][1]);
		}
	});

	bench("Causality check using Bitsets", async () => {
		for (let i = 0; i < samples; i++) {
			obj1.hashGraph.areCausallyRelatedUsingBitsets(tests[i][0], tests[i][1]);
		}
	});
});
