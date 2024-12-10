import { ActionType } from "@ts-drp/object";
import { beforeEach, describe, expect, test } from "vitest";
import {
	AccessControl,
	AccessControlConflictResolution,
} from "../src/AccessControl/index.js";

describe("HashGraph for AddWinSet tests", () => {
	let drp: AccessControl;

	beforeEach(() => {
		const admins = ["peer1", "peer2"];
		drp = new AccessControl(admins, AccessControlConflictResolution.RevokeWins);
	});

	test("Admin nodes should be admins", () => {
		expect(drp.isAdmin("peer1")).toBe(true);
		expect(drp.isAdmin("peer2")).toBe(true);
	});

	test("Admin should have write permissions", () => {
		expect(drp.isWriter("peer1")).toBe(true);
		expect(drp.isWriter("peer2")).toBe(true);
	});

	test("Can not revoke admin permission", () => {
		expect(() => drp.revoke("peer1")).toThrow(
			"Cannot revoke permissions from a node with admin privileges.",
		);
		expect(drp.isWriter("peer1")).toBe(true);
		expect(drp.isAdmin("peer1")).toBe(true);
	});

	test("Grant write permission", () => {
		drp.grant("peer3");
		expect(drp.isWriter("peer3")).toBe(true);
	});

	test("Revoke write permission", () => {
		drp.grant("peer3");
		drp.revoke("peer3");
		expect(drp.isWriter("peer3")).toBe(false);
	});

	test("resolve conflicts", () => {
		const vertices = [
			{
				hash: "",
				nodeId: "peer1",
				operation: { type: "grant", value: "peer3" },
				dependencies: [],
			},
			{
				hash: "",
				nodeId: "peer2",
				operation: { type: "revoke", value: "peer3" },
				dependencies: [],
			},
		];
		const result = drp.resolveConflicts(vertices);
		expect(result.action).toBe(ActionType.DropLeft);
	});
});
