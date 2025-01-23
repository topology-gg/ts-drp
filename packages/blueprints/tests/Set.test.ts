import { beforeEach, describe, expect, test } from "vitest";
import { SetDRP } from "../src/Set/index.js";

describe("HashGraph for AddWinSet tests", () => {
	let drp: SetDRP<number>;

	beforeEach(() => {
		drp = new SetDRP();
	});

	test("Test: Add", () => {
		drp.add(1);
		let set = drp.query_getValues();
		expect(set).toEqual([1]);

		drp.add(2);
		set = drp.query_getValues();
		expect(set).toEqual([1, 2]);
	});

	test("Test: Add and Remove", () => {
		drp.add(1);
		let set = drp.query_getValues();
		expect(set).toEqual([1]);

		drp.add(2);
		set = drp.query_getValues();
		expect(set).toEqual([1, 2]);

		drp.delete(1);
		set = drp.query_getValues();
		expect(drp.query_has(1)).toBe(false);
		expect(set).toEqual([2]);
	});
});
