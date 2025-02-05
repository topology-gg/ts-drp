import { beforeEach, describe, expect, test } from "vitest";

import { SemanticsType } from "../dist/src/hashgraph/index.js";
import { ActionType } from "../dist/src/hashgraph/index.js";
import { DRP, DRPObject, ResolveConflictsType, Vertex } from "../src/index.js";

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

describe("Hi", () => {
	let counter = 0;

	class CounterDRP implements DRP {
		semanticsType = SemanticsType.pair;

		private _counter: number;

		constructor() {
			this._counter = 0;
		}

		test() {
			this._counter++;
			counter++;
			return this._counter;
		}

		resolveConflicts(_: Vertex[]): ResolveConflictsType {
			return { action: ActionType.Nop };
		}
	}

	test("Detect duplicate call", () => {
		const obj = new DRPObject({
			peerId: "",
			publicCredential: {
				ed25519PublicKey: "cred",
				blsPublicKey: "cred",
			},
			drp: new CounterDRP(),
		});

		const testDRP = obj.drp as CounterDRP;
		expect(testDRP).toBeDefined();
		const ret = testDRP.test();
		expect(ret).toBe(counter);
	});
});
