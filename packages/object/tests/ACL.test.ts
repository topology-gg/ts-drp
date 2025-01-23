import { ActionType } from "@ts-drp/object";
import { beforeEach, describe, expect, test } from "vitest";
import { ObjectACL } from "../src/acl/index.js";
import { ACLGroup } from "../src/index.js";
import { DrpType } from "../dist/src/interface.js";

describe("AccessControl tests with RevokeWins resolution", () => {
	let acl: ObjectACL;

	beforeEach(() => {
		acl = new ObjectACL({
			admins: new Map([
				[
					"peer1",
					{
						ed25519PublicKey: "publicKey1",
						blsPublicKey: "publicKey1",
					},
				],
			]),
		});
	});

	test("Admin nodes should have admin privileges", () => {
		expect(acl.query_isAdmin("peer1")).toBe(true);
	});

	test("Admin nodes should have write permissions", () => {
		expect(acl.query_isWriter("peer1")).toBe(true);
	});

	test("Grant write permissions to a new writer", () => {
		acl.grant(
			"peer1",
			"peer3",
			{
				ed25519PublicKey: "publicKey3",
				blsPublicKey: "publicKey3",
			},
			ACLGroup.Writer,
		);

		expect(acl.query_isWriter("peer3")).toBe(true);
	});

	test("Revoke write permissions from a writer", () => {
		acl.grant(
			"peer1",
			"peer3",
			{
				ed25519PublicKey: "publicKey3",
				blsPublicKey: "publicKey3",
			},
			ACLGroup.Writer,
		);
		acl.revoke("peer1", "peer3", ACLGroup.Writer);

		expect(acl.query_isWriter("peer3")).toBe(false);
	});

	test("Cannot revoke admin permissions", () => {
		expect(() => {
			acl.revoke("peer1", "peer1", ACLGroup.Writer);
		}).toThrow("Cannot revoke permissions from a peer with admin privileges.");

		expect(acl.query_isWriter("peer1")).toBe(true);
	});

	test("Resolve conflicts with RevokeWins", () => {
		const vertices = [
			{
				hash: "",
				peerId: "peer1",
				operation: { opType: "grant", value: "peer3", drpType: DrpType.ACL },
				dependencies: [],
				signature: new Uint8Array(),
				timestamp: 0,
			},
			{
				hash: "",
				peerId: "peer2",
				operation: { opType: "revoke", value: "peer3", drpType: DrpType.ACL },
				dependencies: [],
				signature: new Uint8Array(),
				timestamp: 0,
			},
		];
		const result = acl.resolveConflicts(vertices);
		expect(result.action).toBe(ActionType.DropLeft);
	});
});
