import { beforeEach, describe, expect, test } from "vitest";
import { ConflictResolvingMap } from "../src/index.js";

describe("ConflictResolvingMap tests", () => {
	let drp: ConflictResolvingMap<string, string>;

	beforeEach(() => {
		drp = new ConflictResolvingMap();
	});

	test("Test: Update value", () => {
		drp.update("key1", "value1");
		drp.update("key2", "value2");

		expect(drp.query_get("key1")).toBe("value1");
		expect(drp.query_get("key2")).toBe("value2");

		drp.update("key1", "value3");
		expect(drp.query_get("key1")).toBe("value3");
	});

	test("Test: Update and remove value", () => {
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
});
