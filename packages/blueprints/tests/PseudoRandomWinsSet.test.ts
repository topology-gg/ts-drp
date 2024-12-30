import { beforeEach, describe, expect, test } from "vitest";
import { PseudoRandomWinsSet } from "../src/PseudoRandomWinsSet/index.js";

describe("HashGraph for PseudoRandomWinsSet tests", () => {
	let drp: PseudoRandomWinsSet<number>;

	beforeEach(() => {
		drp = new PseudoRandomWinsSet();
	});

	test("Test: Add", () => {
		drp.add(1);
		let set = drp.getValues();
		expect(set).toEqual([1]);

		drp.add(2);
		set = drp.getValues();
		expect(set).toEqual([1, 2]);
	});

	test("Test: Add and Remove", () => {
		drp.add(1);
		let set = drp.getValues();
		expect(set).toEqual([1]);

		drp.add(2);
		set = drp.getValues();
		expect(set).toEqual([1, 2]);

		drp.remove(1);
		set = drp.getValues();
		expect(drp.queryContains(1)).toBe(false);
		expect(set).toEqual([2]);
	});
});
