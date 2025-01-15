import { ActionType } from "@ts-drp/object";
import { beforeEach, describe, expect, test } from "vitest";
import { ConflictResolvingMap } from "../src/index.js";

describe("ConflictResolvingMap tests", () => {
	let drp: ConflictResolvingMap<string, string>;

	beforeEach(() => {
		drp = new ConflictResolvingMap<string, string>();
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

	test("Should return no-op when resolve conflict between operations with different keys", () => {
		const vertex0 = {
			hash: "hash1",
			peerId: "peer1",
			operation: {
				type: "update",
				value: ["key1", "value1"],
			},
			dependencies: [],
			timestamp: 0,
			signature: new Uint8Array(),
		};

		const vertex1 = {
			hash: "hash2",
			peerId: "peer2",
			operation: {
				type: "update",
				value: ["key2", "value2"],
			},
			dependencies: [],
			timestamp: 0,
			signature: new Uint8Array(),
		};

		let vertices = [vertex0, vertex1];
		expect(drp.resolveConflicts(vertices)).toEqual({ action: ActionType.Nop });
		vertex0.operation.value[0] = "remove";
		expect(drp.resolveConflicts(vertices)).toEqual({ action: ActionType.Nop });
		vertices = [vertex1, vertex0];
		expect(drp.resolveConflicts(vertices)).toEqual({ action: ActionType.Nop });
	});

	test("Should return no-op when resolve conflict between two remove operations", () => {
		const vertex0 = {
			hash: "hash1",
			peerId: "peer1",
			operation: {
				type: "remove",
				value: ["key1"],
			},
			dependencies: [],
			timestamp: 0,
			signature: new Uint8Array(),
		};
		const vertex1 = {
			hash: "hash2",
			peerId: "peer2",
			operation: {
				type: "remove",
				value: ["key2"],
			},
			dependencies: [],
			timestamp: 0,
			signature: new Uint8Array(),
		};

		const vertices = [vertex0, vertex1];
		expect(drp.resolveConflicts(vertices)).toEqual({ action: ActionType.Nop });
	});

	test("Should drop operation with lower hash value when resolve conflict between two update operations", () => {
		const vertex0 = {
			hash: "hash1",
			peerId: "peer1",
			operation: {
				type: "update",
				value: ["key1", "value1"],
			},
			dependencies: [],
			timestamp: 0,
			signature: new Uint8Array(),
		};

		const vertex1 = {
			hash: "hash2",
			peerId: "peer2",
			operation: {
				type: "update",
				value: ["key1", "value2"],
			},
			dependencies: [],
			timestamp: 0,
			signature: new Uint8Array(),
		};

		let vertices = [vertex0, vertex1];
		expect(drp.resolveConflicts(vertices)).toEqual({
			action: ActionType.DropRight,
		});

		vertices = [vertex1, vertex0];
		expect(drp.resolveConflicts(vertices)).toEqual({
			action: ActionType.DropLeft,
		});

		vertex1.operation.value[1] = "value1";
		vertices = [vertex0, vertex1];
		expect(drp.resolveConflicts(vertices)).toEqual({ action: ActionType.Nop });
	});

	test("Should drop remove operation when resolve conflict between update and remove operations", () => {
		const vertex0 = {
			hash: "hash1",
			peerId: "peer1",
			operation: {
				type: "update",
				value: ["key1", "value1"],
			},
			dependencies: [],
			timestamp: 0,
			signature: new Uint8Array(),
		};

		const vertex1 = {
			hash: "hash2",
			peerId: "peer2",
			operation: {
				type: "remove",
				value: ["key1"],
			},
			dependencies: [],
			timestamp: 0,
			signature: new Uint8Array(),
		};

		let vertices = [vertex0, vertex1];
		expect(drp.resolveConflicts(vertices)).toEqual({
			action: ActionType.DropRight,
		});

		vertices = [vertex1, vertex0];
		expect(drp.resolveConflicts(vertices)).toEqual({
			action: ActionType.DropLeft,
		});
	});
});
