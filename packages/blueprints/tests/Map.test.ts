import { beforeEach, describe, expect, test } from "vitest";
import { ConflictResolvingMap } from "../src/index.js";

describe("ConflictResolvingMap tests", () => {
	let drp: ConflictResolvingMap<string, string>;

	beforeEach(() => {
		drp = new ConflictResolvingMap();
	});

	test("Should add new entry", () => {
		drp.update("key1", "value1");
		drp.update("key2", "value2");
		expect(drp.query_get("key1")).toBe("value1");
		expect(drp.query_get("key2")).toBe("value2");
		expect(drp.query_entries()).toEqual([
			["key1", "value1"],
			["key2", "value2"],
		]);
	});

	test("Should update existing entries", () => {
		drp.update("key1", "value1");
		drp.update("key2", "value2");

		expect(drp.query_get("key1")).toBe("value1");
		expect(drp.query_get("key2")).toBe("value2");

		drp.update("key1", "value3");
		expect(drp.query_get("key1")).toBe("value3");

		drp.update("key2", "value4");
		expect(drp.query_get("key2")).toBe("value4");
	});

	test("Should update existing entries multiple times", () => {
		drp.update("key1", "value1");
		expect(drp.query_get("key1")).toBe("value1");
		drp.update("key2", "value2");
		drp.update("key2", "value3");
		drp.update("key2", "value4");
		expect(drp.query_get("key2")).toBe("value4");
	});

	test("Should update and remove existing entries", () => {
		drp.update("key1", "value1");
		expect(drp.query_get("key1")).toBe("value1");
		drp.remove("key1");
		expect(drp.query_get("key1")).toBe(undefined);

		drp.update("key1", "value2");
		expect(drp.query_has("key1")).toBe(true);

		drp.update("key2", "value3");
		drp.remove("key1");
		expect(drp.query_has("key1")).toBe(false);
		expect(drp.query_get("key2")).toBe("value3");
	});

	test("Should work correctly when remove is called on non-existing key", () => {
		drp.update("key1", "value1");
		drp.update("key2", "value2");
		drp.remove("key3");
		expect(drp.query_get("key1")).toBe("value1");
		expect(drp.query_get("key2")).toBe("value2");
		expect(drp.query_entries()).toEqual([
			["key1", "value1"],
			["key2", "value2"],
		]);
	});
});
