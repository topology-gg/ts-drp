import { describe, expect, test } from "vitest";

import { ActionType } from "../dist/src/hashgraph/index.js";
import { SemanticsType } from "../dist/src/hashgraph/index.js";
import { DrpType, HashGraph, newVertex, type Vertex } from "../src/index.js";
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
			(_vertices: Vertex[]) => {
				return {
					action: ActionType.Nop,
				};
			},
			SemanticsType.multiple
		);
		for (let i = 0; i < 10; i += 2) {
			const frontier = hashgraph.getFrontier();
			hashgraph.addVertex(
				newVertex(
					"",
					{
						opType: "test",
						value: [i],
						drpType: DrpType.DRP,
					},
					frontier,
					Date.now(),
					new Uint8Array()
				)
			);
			hashgraph.addVertex(
				newVertex(
					"",
					{
						opType: "test",
						value: [i + 1],
						drpType: DrpType.DRP,
					},
					frontier,
					Date.now(),
					new Uint8Array()
				)
			);
		}
		const order = linearizeMultipleSemantics(
			hashgraph,
			HashGraph.rootHash,
			new ObjectSet(hashgraph.getAllVertices().map((vertex) => vertex.hash))
		);
		for (let i = 0; i < 10; i++) {
			expect(order[i].value).toStrictEqual([i]);
		}
	});

	test("should linearize correctly with pair semantics", () => {
		const hashgraph = new HashGraph(
			"",
			(_vertices: Vertex[]) => {
				return {
					action: ActionType.Nop,
				};
			},
			(_vertices: Vertex[]) => {
				const value = _vertices[0].operation?.value;
				if (value && value[0] % 2) {
					return {
						action: ActionType.DropLeft,
					};
				}
				const value1 = _vertices[1].operation?.value;
				if (value1 && value1[0] % 2) {
					return {
						action: ActionType.DropRight,
					};
				}
				return {
					action: ActionType.Nop,
				};
			},
			SemanticsType.pair
		);
		for (let i = 0; i < 10; i += 2) {
			const frontier = hashgraph.getFrontier();
			hashgraph.addVertex(
				newVertex(
					"",
					{
						opType: "test",
						value: [i],
						drpType: DrpType.DRP,
					},
					[frontier[0]],
					Date.now(),
					new Uint8Array()
				)
			);
			hashgraph.addVertex(
				newVertex(
					"",
					{
						opType: "test",
						value: [i + 1],
						drpType: DrpType.DRP,
					},
					[frontier[0]],
					Date.now(),
					new Uint8Array()
				)
			);
		}
		const order = linearizePairSemantics(
			hashgraph,
			HashGraph.rootHash,
			new ObjectSet(hashgraph.getAllVertices().map((vertex) => vertex.hash))
		);
		for (let i = 0; i < 5; i++) {
			expect(order[i].value).toStrictEqual([i * 2]);
		}
	});
});
