import { describe, expect, test } from "vitest";

import { Heap } from "../src/utils/heap.js";
import { MinHeap } from "../src/utils/minHeap.js";

describe("Heap", () => {
	test("MinHeap<number>", () => {
		const heap = new Heap(new MinHeap());

		heap.push("a");
		heap.push("b");
		heap.push("c");

		expect(heap.pop()).toBe("a");
		expect(heap.pop()).toBe("b");
		expect(heap.pop()).toBe("c");
	});
});
