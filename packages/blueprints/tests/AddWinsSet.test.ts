import { beforeEach, describe, expect, test } from "vitest";
import { AddWinsSet } from "../src/AddWinsSet/index.js";

describe("HashGraph for AddWinSet tests", () => {
	let drp: AddWinsSet<number>;

	beforeEach(() => {
		drp = new AddWinsSet();
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
