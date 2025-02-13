/* eslint-disable @typescript-eslint/no-explicit-any */
import { SetDRP } from "@ts-drp/blueprints/src/index.js";
import { NetworkPb } from "@ts-drp/network/src/index.js";
import {
	serializeStateMessage,
	deserializeStateMessage,
	getDRPStateEntryValue,
} from "@ts-drp/node/src/utils.js";
import { expect, describe, it } from "vitest";

import { getDeserializedValue, DRPObject, HashGraph, getSerializedValue } from "../src/index.js";

class TestCustomClass {
	constructor(
		public name: string,
		public value: number
	) {}
}

// Add TestCustomClass to globalThis
(globalThis as any).TestCustomClass = TestCustomClass;

describe("Serialize & deserialize", () => {
	it("should serialize & deserialize correctly simple object", () => {
		const obj = { a: 1, b: 2 };
		const serialized = getSerializedValue({ $case: "object", value: obj });
		const deserialized = getDeserializedValue(serialized);
		if (!deserialized) throw new Error("deserialized value is undef");
		expect(getDRPStateEntryValue(deserialized)).toEqual(obj);
	});

	it("should serialize & deserialize correctly Array", () => {
		const array = [1, 2, 3];
		const serialized = getSerializedValue({ $case: "object", value: array });
		const deserialized = getDeserializedValue(serialized);
		if (!deserialized) throw new Error("deserialized value is undef");
		expect(getDRPStateEntryValue(deserialized)).toEqual(array);
	});

	it("should serialize & deserialize correctly array of objects", () => {
		const array = [{ a: 1 }, { b: 2 }, { c: 3 }];
		const serialized = getSerializedValue({ $case: "object", value: array });
		const deserialized = getDeserializedValue(serialized);
		if (!deserialized) throw new Error("deserialized value is undef");
		expect(getDRPStateEntryValue(deserialized)).toEqual(array);
	});

	it("should serialize & deserialize correctly array of arrays", () => {
		const array = [
			[1, 2],
			[3, 4],
			[5, 6],
		];
		const serialized = getSerializedValue({ $case: "object", value: array });
		const deserialized = getDeserializedValue(serialized);
		if (!deserialized) throw new Error("deserialized value is undef");
		expect(getDRPStateEntryValue(deserialized)).toEqual(array);
	});

	it("should serialize & deserialize correctly object with array", () => {
		const obj = { a: [1, 2, 3] };
		const serialized = getSerializedValue({ $case: "object", value: obj });
		const deserialized = getDeserializedValue(serialized);
		if (!deserialized) throw new Error("deserialized value is undef");
		expect(getDRPStateEntryValue(deserialized)).toEqual(obj);
	});

	it("should serialize & deserialize correctly object with array of objects", () => {
		const obj = { a: [{ b: 1 }, { c: 2 }] };
		const serialized = getSerializedValue({ $case: "object", value: obj });
		const deserialized = getDeserializedValue(serialized);
		if (!deserialized) throw new Error("deserialized value is undef");
		expect(getDRPStateEntryValue(deserialized)).toEqual(obj);
	});

	it("should serialize & deserialize correctly simple Date", () => {
		const date = new Date();
		const serialized = getSerializedValue({ $case: "object", value: date });
		const deserialized = getDeserializedValue(serialized);
		if (!deserialized) throw new Error("deserialized value is undef");
		expect(getDRPStateEntryValue(deserialized)).toEqual(date);
	});

	it("should serialize & deserialize correctly simple Map", () => {
		const map = new Map([
			["a", 1],
			["b", 2],
		]);
		const serialized = getSerializedValue({ $case: "object", value: map });
		const deserialized = getDeserializedValue(serialized);
		if (!deserialized) throw new Error("deserialized value is undef");
		expect(getDRPStateEntryValue(deserialized)).toEqual(map);
	});

	it("should serialize & deserialize correctly simple Map with nested Map", () => {
		const map = new Map<string, any>([
			["a", 1],
			["b", 2],
			[
				"c",
				new Map([
					["a", 3],
					["e", 4],
				]),
			],
		]);
		const serialized = getSerializedValue({ $case: "object", value: map });
		const deserialized = getDeserializedValue(serialized);
		if (!deserialized) throw new Error("deserialized value is undef");
		expect(getDRPStateEntryValue(deserialized)).toEqual(map);
	});

	it("should serialize & deserialize correctly simple Set", () => {
		const set = new Set([1, 2]);
		const serialized = getSerializedValue({ $case: "object", value: set });
		const deserialized = getDeserializedValue(serialized);
		if (!deserialized) throw new Error("deserialized value is undef");
		expect(getDRPStateEntryValue(deserialized)).toEqual(set);
	});

	it("should serialize & deserialize correctly complex map", () => {
		const map = new Map<string, any>();
		map.set("a", new Set([1, 2]));
		map.set("b", new Set([3, 4]));
		map.set("c", { a: 1, b: 2 });
		map.set("d", new Date());
		map.set("e", [1, 2, 3]);
		// Map<String, Map<String, Map<String, Set<Number>>>>
		const nestedMap = new Map<string, any>();
		nestedMap.set(
			"a",
			new Map<string, any>([["a", new Map<string, any>([["a", new Set([1, 2])]])]])
		);
		map.set("f", nestedMap);

		const serialized = getSerializedValue({ $case: "object", value: map });
		const deserialized = getDeserializedValue(serialized);
		if (!deserialized) throw new Error("deserialized value is undef");
		expect(getDRPStateEntryValue(deserialized)).toEqual(map);
	});

	it("should serialize & deserialize correctly complex set", () => {
		const set = new Set<any>();
		set.add(new Set([1, 2]));
		set.add(new Set([3, 4]));
		set.add({ a: 1, b: 2 });
		set.add(new Date());
		set.add([1, 2, 3]);
		const serialized = getSerializedValue({ $case: "object", value: set });
		const deserialized = getDeserializedValue(serialized);
		if (!deserialized) throw new Error("deserialized value is undef");
		expect(getDRPStateEntryValue(deserialized)).toEqual(set);
	});

	it("should serialize & deserialize correctly Uint8Array", () => {
		const uint8Array = new Uint8Array([1, 2, 3, 4]);
		const serialized = getSerializedValue({ $case: "object", value: uint8Array });
		const deserialized = getDeserializedValue(serialized);
		if (!deserialized) throw new Error("deserialized value is undef");
		expect(getDRPStateEntryValue(deserialized)).toEqual(uint8Array);
	});

	it("should serialize & deserialize correctly Float32Array", () => {
		const float32Array = new Float32Array([1.1, 2.2, 3.3, 4.4]);
		const serialized = getSerializedValue({ $case: "object", value: float32Array });
		const deserialized = getDeserializedValue(serialized);
		if (!deserialized) throw new Error("deserialized value is undef");
		expect(getDRPStateEntryValue(deserialized)).toEqual(float32Array);
	});

	it("should serialize & deserialize correctly CustomClass", () => {
		const customObj = { a: new TestCustomClass("test", 42) };
		const serialized = getSerializedValue({ $case: "object", value: customObj });
		const deserialized = getDeserializedValue(serialized);
		if (!deserialized) throw new Error("deserialized value is undef");
		console.log("deserialized", deserialized);
		console.log("customObj", customObj);
		expect(getDRPStateEntryValue(deserialized)).toEqual(customObj);
	});

	it("should serialize & deserialize correctly complex array", () => {
		const array = [
			new Set([1, 2]),
			new Set([3, 4]),
			{ a: 1, b: 2 },
			new Date(),
			[1, 2, 3],
			[new Set([1, 2])],
			new Map<string, any>([
				["a", 1],
				["b", 2],
				["c", new Set([1, 2])],
				["d", new Date()],
			]),
			new Set([1, 2]),
			new Date(),
			new TestCustomClass("test", 42),
			[new TestCustomClass("test", 42)],
		];
		const serialized = getSerializedValue({ $case: "object", value: array });
		const deserialized = getDeserializedValue(serialized);
		if (!deserialized) throw new Error("deserialized value is undef");
		expect(getDRPStateEntryValue(deserialized)).toEqual(array);
	});

	it("should serialize & deserialize correctly complex nested object", () => {
		const obj = {
			a: new Set([1, 2]),
			b: new Set([3, 4]),
			c: { a: 1, b: 2 },
			d: new Date(),
			e: [1, 2, 3],
			f: new Map<string, any>([
				["a", 1],
				["b", 2],
				["c", new Set([1, 2])],
				["d", new Date()],
				["e", [1, 2, 3]],
				["f", new Uint8Array([1, 2, 3, 4])],
				["g", new Float32Array([1.1, 2.2, 3.3, 4.4])],
				["h", new TestCustomClass("test", 42)],
			]),
			g: new Uint8Array([1, 2, 3, 4]),
			h: new Float32Array([1.1, 2.2, 3.3, 4.4]),
			i: new TestCustomClass("nested", 123),
			j: [new Set([1, 2, 3])],
			k: [new TestCustomClass("nested", 123)],
			l: [
				new Map<string, any>([
					["a", 1],
					["b", 2],
					["c", new Set([1, 2])],
					["d", new Date()],
					["e", [1, 2, 3]],
					["f", new Uint8Array([1, 2, 3, 4])],
					["g", new Float32Array([1.1, 2.2, 3.3, 4.4])],
					["h", new TestCustomClass("test", 42)],
				]),
			],
		};
		const serialized = getSerializedValue({ $case: "object", value: obj });
		const deserialized = getDeserializedValue(serialized);
		if (!deserialized) throw new Error("deserialized value is undef");
		expect(getDRPStateEntryValue(deserialized)).toEqual(obj);
	});

	it("should serialize & deserialize SetDRP", () => {
		const drpObject = DRPObject.createObject({
			peerId: "test",
			drp: new SetDRP(),
		});
		const aclState = drpObject.aclStates.get(HashGraph.rootHash);
		const drpState = drpObject.drpStates.get(HashGraph.rootHash);
		const response = NetworkPb.FetchStateResponse.create({
			objectId: "test",
			vertexHash: "test",
			aclState: serializeStateMessage(aclState),
			drpState: serializeStateMessage(drpState),
		});
		const data = NetworkPb.FetchStateResponse.encode(response).finish();
		const decoded = NetworkPb.FetchStateResponse.decode(data);
		const aclStateDecoded = deserializeStateMessage(decoded.aclState);
		const drpStateDecoded = deserializeStateMessage(decoded.drpState);
		expect(aclStateDecoded).toStrictEqual(aclState);
		expect(drpStateDecoded).toStrictEqual(drpState);
	});
});
