import { beforeEach, describe, expect, test } from "vitest";

import { BitSet } from "../src/hashgraph/bitset.js";

describe("BitSet Test", () => {
	let bitset: BitSet;

	beforeEach(() => {
		// Bitset of size 65
		bitset = new BitSet(65);
	});

	test("Test: Bitset data", () => {
		for (let i = 0; i < 65; i++) {
			bitset.set(i, true);
		}
		for (let i = 0; i < 65; i++) {
			expect(bitset.get(i)).toBe(true);
		}
		for (let i = 0; i < 65; i++) {
			bitset.set(i, false);
		}
		for (let i = 0; i < 65; i++) {
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

		let other: BitSet = new BitSet(65);
		other.set(0, true);
		other = other.or(bitset);
		expect(other.get(0)).toBe(true);

		other.set(0, false);
		expect(other.get(0)).toBe(false);

		other = other.and(bitset);
		expect(other.get(0)).toBe(false);
	});
});
