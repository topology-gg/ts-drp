import { beforeEach, describe, expect, test } from "vitest";

import { DRPObject } from "../src/index.js";

describe("AccessControl tests with RevokeWins resolution", () => {
	beforeEach(() => {});

	test("Test creating DRPObject wo/ ACL and publicCred", () => {
		expect(() => new DRPObject({ peerId: "" })).toThrow(
			"Either publicCredential or acl must be provided to create a DRPObject"
		);
	});

	test("Test creating DRPObject w/ publicCred", () => {
		const cred = {
			ed25519PublicKey: "cred",
			blsPublicKey: "cred",
		};
		const obj = new DRPObject({ peerId: "", publicCredential: cred });
		expect(obj.acl).toBeDefined();
	});

	test("Test creating an object wo/ DRP", () => {
		const obj = DRPObject.createObject({ peerId: "" });
		expect(obj.drp).toBeUndefined();
	});
});
