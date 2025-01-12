import { beforeEach, describe, expect, test } from "vitest";
import { BitSet } from "../src/hashgraph/bitset.js";

describe("BitSet Test", () => {
	let bitset: BitSet;

	beforeEach(() => {
		// Bitset of size 64
		bitset = new BitSet(64);
	});

	test("Test: Bitset data", () => {
		for (let i = 0; i < 64; i++) {
			bitset.set(i, true);
		}
		for (let i = 0; i < 64; i++) {
			expect(bitset.get(i)).toBe(true);
		}
		for (let i = 0; i < 64; i++) {
			bitset.set(i, false);
		}
		for (let i = 0; i < 64; i++) {
			expect(bitset.get(i)).toBe(false);
		}
	});

	test("Test: BitSet", () => {
		bitset.set(0, true);
		bitset.set(50, true);

		expect(bitset.get(0)).toBe(true);
		expect(bitset.get(49)).toBe(false);
		expect(bitset.get(50)).toBe(true);

		bitset.flip(49);
		bitset.flip(50);
		expect(bitset.get(49)).toBe(true);
		expect(bitset.get(50)).toBe(false);

		bitset.clear();

		let other: BitSet = new BitSet(64);
		other.set(0, true);
		other = other.or(bitset);
		expect(other.get(0)).toBe(true);

		other.set(0, false);
		expect(other.get(0)).toBe(false);

		other = other.and(bitset);
		expect(other.get(0)).toBe(false);
	});

	test("find next index of one-bit", () => {
		bitset.set(5, true);
		bitset.set(10, true);
		bitset.set(20, true);
		bitset.set(30, true);
		bitset.set(40, true);

		expect(bitset.findNext(0, 1)).toBe(5);
		expect(bitset.findNext(5, 1)).toBe(10);
		expect(bitset.findNext(10, 1)).toBe(20);
		expect(bitset.findNext(20, 1)).toBe(30);
		expect(bitset.findNext(30, 1)).toBe(40);
		expect(bitset.findNext(40, 1)).toBe(64);
	});

	test("find next index of zero-bit", () => {
		for (let i = 0; i < 64; i++) {
			bitset.set(i, true);
		}

		bitset.set(5, false);
		bitset.set(10, false);
		bitset.set(20, false);
		bitset.set(30, false);
		bitset.set(40, false);

		expect(bitset.findNext(0, 0)).toBe(5);
		expect(bitset.findNext(5, 0)).toBe(10);
		expect(bitset.findNext(10, 0)).toBe(20);
		expect(bitset.findNext(20, 0)).toBe(30);
		expect(bitset.findNext(30, 0)).toBe(40);
		expect(bitset.findNext(40, 0)).toBe(64);
	});
});
