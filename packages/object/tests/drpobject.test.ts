import { SetDRP } from "@ts-drp/blueprints/src/index.js";
import { beforeEach, describe, expect, it, test } from "vitest";

import { DRPObject, ObjectACL } from "../src/index.js";

const acl = new ObjectACL({
	admins: new Map([
		["peer1", { ed25519PublicKey: "pubKey1", blsPublicKey: "pubKey1" }],
		["peer2", { ed25519PublicKey: "pubKey2", blsPublicKey: "pubKey2" }],
		["peer3", { ed25519PublicKey: "pubKey3", blsPublicKey: "pubKey3" }],
	]),
});

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

describe("Drp Object should be able to change state value", () => {
	let drpObject: DRPObject;

	beforeEach(async () => {
		drpObject = new DRPObject({ peerId: "peer1", acl, drp: new SetDRP<number>() });
	});

	it("should update ACL state keys when DRP state changes", () => {
		const drpSet = drpObject.drp as SetDRP<number>;
		const aclInstance = drpObject.acl as ObjectACL;

		// Add a value to the DRP set
		drpSet.add(1);

		// Get the ACL states and expected variable names
		const aclStates = drpObject.aclStates.values();
		const expectedKeys = Object.keys(aclInstance);

		// Check that each state contains the expected keys
		for (const state of aclStates) {
			const stateKeys = state.state.map((x) => x.key);
			expect(stateKeys).toEqual(expectedKeys);
		}

		const drpStates = drpObject.drpStates.values();
		const expectedDrpKeys = Object.keys(drpSet);

		// Check that each state contains the expected keys
		for (const state of drpStates) {
			const stateKeys = state.state.map((x) => x.key);
			expect(stateKeys).toEqual(expectedDrpKeys);
		}
	});
});
