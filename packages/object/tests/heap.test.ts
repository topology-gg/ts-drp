import { describe, expect, test } from "vitest";

import { Heap } from "../src/utils/heap.js";
import { MinHeap } from "../src/utils/minHeap.js";

describe("Heap", () => {
	test("MinHeap basic operations", () => {
		const heap = new Heap(new MinHeap());

		heap.push("a");
		heap.push("b");
		heap.push("c");

		expect(heap.length()).toBe(3);
		expect(heap.pop()).toBe("a");
		expect(heap.pop()).toBe("b");
		expect(heap.pop()).toBe("c");
		expect(heap.pop()).toBeUndefined();
	});

	test("MinHeap with unordered insertions", () => {
		const heap = new Heap(new MinHeap());

		heap.push("c");
		heap.push("a");
		heap.push("b");

		expect(heap.pop()).toBe("a");
		expect(heap.pop()).toBe("b");
		expect(heap.pop()).toBe("c");
	});

	test("MinHeap with duplicates", () => {
		const heap = new Heap(new MinHeap());

		heap.push("b");
		heap.push("a");
		heap.push("b");
		heap.push("a");

		expect(heap.pop()).toBe("a");
		expect(heap.pop()).toBe("a");
		expect(heap.pop()).toBe("b");
		expect(heap.pop()).toBe("b");
	});

	test("MinHeap remove operation", () => {
		const heap = new Heap(new MinHeap());

		heap.push("d");
		heap.push("b");
		heap.push("a");
		heap.push("c");

		expect(heap.remove(1)).toBe("c");
		expect(heap.pop()).toBe("a");
		expect(heap.pop()).toBe("b");
		expect(heap.pop()).toBe("d");
	});

	test("MinHeap edge cases", () => {
		const heap = new Heap(new MinHeap());

		// Empty heap operations
		expect(heap.length()).toBe(0);
		expect(heap.pop()).toBeUndefined();
		expect(heap.remove(0)).toBeUndefined();

		// Single element
		heap.push("a");
		expect(heap.length()).toBe(1);
		expect(heap.pop()).toBe("a");
		expect(heap.length()).toBe(0);

		// Push after empty
		heap.push("b");
		expect(heap.pop()).toBe("b");
	});

	test("MinHeap with special characters", () => {
		const heap = new Heap(new MinHeap());

		heap.push("!");
		heap.push("@");
		heap.push("#");
		heap.push("$");

		expect(heap.pop()).toBe("!");
		expect(heap.pop()).toBe("#");
		expect(heap.pop()).toBe("$");
		expect(heap.pop()).toBe("@");
	});

	test("MinHeap stress test", () => {
		const heap = new Heap(new MinHeap());
		const items = Array.from({ length: 100 }, (_, i) => String.fromCharCode(65 + (i % 26)));

		// Push all items
		items.forEach((item) => heap.push(item));
		expect(heap.length()).toBe(100);

		// Verify they come out in sorted order
		let prev = heap.pop();
		expect(prev).toBeDefined();

		while (heap.length() > 0) {
			const current = heap.pop();
			expect(current).toBeDefined();
			if (prev != null && current != null) {
				expect(prev <= current).toBe(true);
			}
			prev = current;
		}
	});
});
