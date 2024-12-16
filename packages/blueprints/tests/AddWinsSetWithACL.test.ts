import { generateKeyPairSync } from "node:crypto";
import { ActionType } from "@ts-drp/object";
import { beforeEach, describe, expect, test } from "vitest";
import { AddWinsSetWithACL } from "../src/AddWinsSetWithACL/index.js";

describe("AccessControl tests with RevokeWins resolution", () => {
	let drp: AddWinsSetWithACL<number>;
	let keyPair: { publicKey: string; privateKey: string };

	beforeEach(() => {
		keyPair = generateKeyPairSync("rsa", {
			modulusLength: 2048,
			publicKeyEncoding: { type: "spki", format: "pem" },
			privateKeyEncoding: { type: "pkcs8", format: "pem" },
		});

		drp = new AddWinsSetWithACL(new Map([["peer1", keyPair.publicKey]]));
	});

	test("Admin nodes should have admin privileges", () => {
		expect(drp.isAdmin("peer1")).toBe(true);
	});

	test("Admin nodes should have write permissions", () => {
		expect(drp.isWriter("peer1")).toBe(true);
	});

	test("Grant write permissions to a new writer", () => {
		drp.grant("peer1", "peer3", keyPair.publicKey);

		expect(drp.isWriter("peer3")).toBe(true);
	});

	test("Revoke write permissions from a writer", () => {
		drp.grant("peer1", "peer3", keyPair.publicKey);
		drp.revoke("peer1", "peer3");

		expect(drp.isWriter("peer3")).toBe(false);
	});

	test("Cannot revoke admin permissions", () => {
		expect(() => {
			drp.revoke("peer1", "peer1");
		}).toThrow("Cannot revoke permissions from a node with admin privileges.");

		expect(drp.isWriter("peer1")).toBe(true);
	});

	test("Resolve conflicts with RevokeWins", () => {
		const vertices = [
			{
				hash: "",
				nodeId: "peer1",
				operation: { type: "grant", value: "peer3" },
				dependencies: [],
				signature: "",
			},
			{
				hash: "",
				nodeId: "peer2",
				operation: { type: "revoke", value: "peer3" },
				dependencies: [],
				signature: "",
			},
		];
		const result = drp.resolveConflicts(vertices);
		expect(result.action).toBe(ActionType.DropLeft);
	});
});
