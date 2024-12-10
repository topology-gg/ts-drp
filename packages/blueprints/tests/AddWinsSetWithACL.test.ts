import { createSign, generateKeyPairSync } from "node:crypto";
import { ActionType } from "@ts-drp/object";
import type { Operation } from "@ts-drp/object";
import { beforeEach, describe, expect, test } from "vitest";
import {
	AccessControl,
	AccessControlConflictResolution,
} from "../src/AccessControl/index.js";
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

		drp = new AddWinsSetWithACL([keyPair.publicKey]);
	});

	test("Admin nodes should have admin privileges", () => {
		expect(drp.isAdmin(keyPair.publicKey)).toBe(true);
	});

	test("Admin nodes should have write permissions", () => {
		expect(drp.isWriter(keyPair.publicKey)).toBe(true);
	});

	test("Grant write permissions to a new writer", () => {
		const signature = signOperation(keyPair.privateKey, {
			type: "grant",
			value: "peer3",
		});
		drp.grant(keyPair.publicKey, signature, "peer3");

		expect(drp.isWriter("peer3")).toBe(true);
	});

	test("Revoke write permissions from a writer", () => {
		const grantSignature = signOperation(keyPair.privateKey, {
			type: "grant",
			value: "peer3",
		});
		drp.grant(keyPair.publicKey, grantSignature, "peer3");

		const revokeSignature = signOperation(keyPair.privateKey, {
			type: "revoke",
			value: "peer3",
		});
		drp.revoke(keyPair.publicKey, revokeSignature, "peer3");

		expect(drp.isWriter("peer3")).toBe(false);
	});

	test("Cannot revoke admin permissions", () => {
		const revokeSignature = signOperation(keyPair.privateKey, {
			type: "revoke",
			value: keyPair.publicKey,
		});

		expect(() => {
			drp.revoke(keyPair.publicKey, revokeSignature, keyPair.publicKey);
		}).toThrow("Cannot revoke permissions from a node with admin privileges.");

		expect(drp.isWriter(keyPair.publicKey)).toBe(true);
	});

	test("Resolve conflicts with RevokeWins", () => {
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

	test("Invalid signature is not verified", () => {
		const signature = "abcdef1234567890";
		expect(() => drp.grant(keyPair.publicKey, signature, "peer3")).toThrow(
			"Invalid signature.",
		);
	});
});

function signOperation(privateKey: string, operation: Operation): string {
	const signer = createSign("sha256");
	signer.update(operation.type);
	signer.update(operation.value);
	signer.end();
	return signer.sign(privateKey, "hex");
}
