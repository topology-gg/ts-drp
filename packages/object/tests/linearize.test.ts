import { describe, expect, test } from "vitest";
import { ActionType } from "../dist/src/hashgraph/index.js";
import { SemanticsType } from "../dist/src/hashgraph/index.js";
import { HashGraph, type Vertex } from "../src/index.js";
import { linearizeMultipleSemantics } from "../src/linearize/multipleSemantics.js";
import { linearizePairSemantics } from "../src/linearize/pairSemantics.js";
import { ObjectSet } from "../src/utils/objectSet.js";

describe("Linearize correctly", () => {
	test("should linearize correctly with multiple semantics", () => {
		const hashgraph = new HashGraph(
			"",
			(_vertices: Vertex[]) => {
				return {
					action: ActionType.Nop,
				};
			},
			SemanticsType.multiple,
		);
		for (let i = 0; i < 10; i += 2) {
			const frontier = hashgraph.getFrontier();
			hashgraph.addVertex(
				{
					type: "test",
					value: [i],
				},
				frontier,
				"",
				Date.now(),
				new Uint8Array(),
			);
			hashgraph.addVertex(
				{
					type: "test",
					value: [i + 1],
				},
				frontier,
				"",
				Date.now(),
				new Uint8Array(),
			);
		}
		const order = linearizeMultipleSemantics(
			hashgraph,
			HashGraph.rootHash,
			new ObjectSet(hashgraph.getAllVertices().map((vertex) => vertex.hash)),
		);
		for (let i = 0; i < 10; i++) {
			expect(order[i].value).toStrictEqual([i]);
		}
	});

	test("should linearize correctly with pair semantics", () => {
		const hashgraph = new HashGraph(
			"",
			(_vertices: Vertex[]) => {
				const value = _vertices[0].operation?.value;
				if (value && value[0] % 2) {
					return {
						action: ActionType.DropLeft,
					};
				}
				return {
					action: ActionType.DropRight,
				};
			},
			SemanticsType.pair,
		);
		for (let i = 0; i < 10; i += 2) {
			const frontier = hashgraph.getFrontier();
			hashgraph.addVertex(
				{
					type: "test",
					value: [i],
				},
				frontier,
				"",
				Date.now(),
				new Uint8Array(),
			);
			hashgraph.addVertex(
				{
					type: "test",
					value: [i + 1],
				},
				frontier,
				"",
				Date.now(),
				new Uint8Array(),
			);
		}
		const order = linearizePairSemantics(
			hashgraph,
			HashGraph.rootHash,
			new ObjectSet(hashgraph.getAllVertices().map((vertex) => vertex.hash)),
		);
		for (let i = 0; i < 5; i++) {
			expect(order[i].value).toStrictEqual([i * 2]);
		}
	});
});
