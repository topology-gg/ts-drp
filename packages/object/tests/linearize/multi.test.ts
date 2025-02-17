import { newVertex } from "@ts-drp/object/src/index.js";
import { describe, expect, test } from "vitest";

import { ActionType, HashGraph, type Vertex, SemanticsType } from "../../src/hashgraph/index.js";
import { DrpType } from "../../src/index.js";
import { linearizeMultipleSemantics } from "../../src/linearize/multipleSemantics.js";
import { ObjectSet } from "../../src/utils/objectSet.js";

describe("linearizeMultipleSemantics", () => {
	test("should linearize operations in a simple sequence", () => {
		const hashGraph = new HashGraph(
			"",
			(_vertices: Vertex[]) => ({
				action: ActionType.Nop,
			}),
			() => ({
				action: ActionType.Nop,
			}),
			SemanticsType.multiple
		);
		const origin = HashGraph.rootHash;

		// Add vertices to the graph
		hashGraph.addVertex(
			newVertex(
				"",
				{
					opType: "set",
					value: [1],
					drpType: DrpType.DRP,
				},
				hashGraph.getFrontier(),
				Date.now(),
				new Uint8Array()
			)
		);

		hashGraph.addVertex(
			newVertex(
				"",
				{
					opType: "set",
					value: [2],
					drpType: DrpType.DRP,
				},
				hashGraph.getFrontier(),
				Date.now(),
				new Uint8Array()
			)
		);

		const subgraph = new ObjectSet<string>();
		hashGraph.getAllVertices().forEach((vertex) => subgraph.add(vertex.hash));

		const result = linearizeMultipleSemantics(hashGraph, origin, subgraph);
		expect(result.map((op) => op.value)).toEqual([[1], [2]]);
	});

	test("should handle concurrent operations with conflict resolution", () => {
		const hashGraph = new HashGraph(
			"",
			(_vertices: Vertex[]) => ({
				action: ActionType.Drop,
				vertices: _vertices.filter((_, index) => index !== 0).map((vertex) => vertex.hash),
			}),
			(_vertices: Vertex[]) => ({
				action: ActionType.Drop,
				vertices: _vertices.filter((_, index) => index !== 0).map((vertex) => vertex.hash),
			}),
			SemanticsType.multiple
		);
		const origin = HashGraph.rootHash;
		let frontier = hashGraph.getFrontier();

		// Add concurrent vertices
		hashGraph.addVertex(
			newVertex(
				"",
				{
					opType: "set",
					value: [1],
					drpType: DrpType.DRP,
				},
				frontier,
				Date.now(),
				new Uint8Array()
			)
		);

		hashGraph.addVertex(
			newVertex(
				"",
				{
					opType: "set",
					value: [2],
					drpType: DrpType.DRP,
				},
				frontier,
				Date.now(),
				new Uint8Array()
			)
		);

		hashGraph.addVertex(
			newVertex(
				"",
				{
					opType: "set",
					value: [3],
					drpType: DrpType.DRP,
				},
				frontier,
				Date.now(),
				new Uint8Array()
			)
		);

		// Get the frontier
		frontier = hashGraph.getFrontier();

		hashGraph.addVertex(
			newVertex(
				"",
				{
					opType: "set",
					value: [4],
					drpType: DrpType.DRP,
				},
				frontier,
				Date.now(),
				new Uint8Array()
			)
		);
		console.log(`frontier: ${frontier}`);
		hashGraph.addVertex(
			newVertex(
				"",
				{
					opType: "set",
					value: [5],
					drpType: DrpType.DRP,
				},
				frontier.filter((_, idx) => idx !== 0),
				Date.now(),
				new Uint8Array()
			)
		);

		frontier = hashGraph.getFrontier();

		hashGraph.addVertex(
			newVertex(
				"",
				{
					opType: "set",
					value: [6],
					drpType: DrpType.DRP,
				},
				frontier,
				Date.now(),
				new Uint8Array()
			)
		);

		const subgraph = new ObjectSet<string>();
		hashGraph.getAllVertices().forEach((vertex) => subgraph.add(vertex.hash));

		const result = linearizeMultipleSemantics(hashGraph, origin, subgraph);
		expect(result.map((op) => op.value)).toEqual([[1], [4], [6]]);
	});

	test("should handle operations with null values", () => {
		const hashGraph = new HashGraph(
			"",
			() => ({
				action: ActionType.Nop,
			}),
			() => ({
				action: ActionType.Nop,
			}),
			SemanticsType.multiple
		);
		const origin = HashGraph.rootHash;

		// Add vertices to the graph
		hashGraph.addVertex(
			newVertex(
				"",
				{
					opType: "set",
					value: null,
					drpType: DrpType.DRP,
				},
				hashGraph.getFrontier(),
				Date.now(),
				new Uint8Array()
			)
		);

		hashGraph.addVertex(
			newVertex(
				"",
				{
					opType: "set",
					value: [2],
					drpType: DrpType.DRP,
				},
				hashGraph.getFrontier(),
				Date.now(),
				new Uint8Array()
			)
		);

		const subgraph = new ObjectSet<string>();
		hashGraph.getAllVertices().forEach((vertex) => subgraph.add(vertex.hash));

		const result = linearizeMultipleSemantics(hashGraph, origin, subgraph);
		expect(result.map((op) => op.value)).toEqual([[2]]);
	});

	test("should handle empty subgraph", () => {
		const hashGraph = new HashGraph(
			"",
			() => ({
				action: ActionType.Nop,
			}),
			() => ({
				action: ActionType.Nop,
			}),
			SemanticsType.multiple
		);
		const origin = HashGraph.rootHash;

		const subgraph = new ObjectSet<string>();
		subgraph.add(origin);

		const result = linearizeMultipleSemantics(hashGraph, origin, subgraph);
		expect(result).toEqual([]);
	});
});
