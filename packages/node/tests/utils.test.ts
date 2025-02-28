import { SetDRP } from "@ts-drp/blueprints";
import { DRPObject } from "@ts-drp/object";
import { beforeAll, describe, expect, test } from "vitest";

import { deserializeStateMessage, serializeStateMessage } from "../src/utils/serialize.js";

describe("State message utils", () => {
	let object: DRPObject<SetDRP<number>>;

	beforeAll(async () => {
		object = DRPObject.createObject({
			peerId: "test",
			id: "test",
			drp: new SetDRP<number>(),
		});
		object.drp?.add(1);
		object.drp?.add(2);
		object.drp?.add(3);
	});

	test("Should serialize/deserialize state message", async () => {
		const state = object["_computeDRPState"].bind(object);
		const serialized = serializeStateMessage(state(object.hashGraph.getFrontier()));
		const deserialized = deserializeStateMessage(serialized);
		expect(deserialized).toStrictEqual(state(object.hashGraph.getFrontier()));
	});
});
