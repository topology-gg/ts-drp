/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, describe, it } from "vitest";

import { deserializeValue, serializeValue } from "../src/index.js";

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
		const serialized = serializeValue(obj);
		const deserialized = deserializeValue(serialized);
		expect(deserialized).toEqual(obj);
	});

	it("should serialize & deserialize correctly Array", () => {
		const array = [1, 2, 3];
		const serialized = serializeValue(array);
		const deserialized = deserializeValue(serialized);
		expect(deserialized).toEqual(array);
	});

	it("should serialize & deserialize correctly array of objects", () => {
		const array = [{ a: 1 }, { b: 2 }, { c: 3 }];
		const serialized = serializeValue(array);
		const deserialized = deserializeValue(serialized);
		expect(deserialized).toEqual(array);
	});

	it("should serialize & deserialize correctly array of arrays", () => {
		const array = [
			[1, 2],
			[3, 4],
			[5, 6],
		];
		const serialized = serializeValue(array);
		const deserialized = deserializeValue(serialized);
		expect(deserialized).toEqual(array);
	});

	it("should serialize & deserialize correctly object with array", () => {
		const obj = { a: [1, 2, 3] };
		const serialized = serializeValue(obj);
		const deserialized = deserializeValue(serialized);
		expect(deserialized).toEqual(obj);
	});

	it("should serialize & deserialize correctly object with array of objects", () => {
		const obj = { a: [{ b: 1 }, { c: 2 }] };
		const serialized = serializeValue(obj);
		const deserialized = deserializeValue(serialized);
		expect(deserialized).toEqual(obj);
	});

	it("should serialize & deserialize correctly simple Date", () => {
		const date = new Date();
		const serialized = serializeValue(date);
		const deserialized = deserializeValue(serialized);
		expect(deserialized).toEqual(date);
	});

	it("should serialize & deserialize correctly simple Map", () => {
		const map = new Map([
			["a", 1],
			["b", 2],
		]);
		const serialized = serializeValue(map);
		const deserialized = deserializeValue(serialized);
		expect(deserialized).toEqual(map);
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
		const serialized = serializeValue(map);
		const deserialized = deserializeValue(serialized);
		expect(deserialized).toEqual(map);
	});

	it("should serialize & deserialize correctly simple Set", () => {
		const set = new Set([1, 2]);
		const serialized = serializeValue(set);
		const deserialized = deserializeValue(serialized);
		expect(deserialized).toEqual(set);
	});

	it("should serialize & deserialize correctly complex map", () => {
		const map = new Map<string, any>();
		map.set("a", new Set([1, 2]));
		map.set("b", new Set([3, 4]));
		map.set("c", { a: 1, b: 2 });
		map.set("d", new Date());
		map.set("e", [1, 2, 3]);
		const serialized = serializeValue(map);
		const deserialized = deserializeValue(serialized);
		expect(deserialized).toEqual(map);
	});

	it("should serialize & deserialize correctly complex set", () => {
		const set = new Set<any>();
		set.add(new Set([1, 2]));
		set.add(new Set([3, 4]));
		set.add({ a: 1, b: 2 });
		set.add(new Date());
		set.add([1, 2, 3]);
		const serialized = serializeValue(set);
		const deserialized = deserializeValue(serialized);
		expect(deserialized).toEqual(set);
	});

	it("should serialize & deserialize correctly Uint8Array", () => {
		const uint8Array = new Uint8Array([1, 2, 3, 4]);
		const serialized = serializeValue(uint8Array);
		const deserialized = deserializeValue(serialized);
		expect(deserialized).toEqual(uint8Array);
	});

	it("should serialize & deserialize correctly Float32Array", () => {
		const float32Array = new Float32Array([1.1, 2.2, 3.3, 4.4]);
		const serialized = serializeValue(float32Array);
		const deserialized = deserializeValue(serialized);
		expect(deserialized).toEqual(float32Array);
	});

	it("should serialize & deserialize correctly CustomClass", () => {
		const customObj = { a: new TestCustomClass("test", 42) };
		const serialized = serializeValue(customObj);
		const deserialized = deserializeValue(serialized);
		console.log("deserialized", deserialized);
		console.log("customObj", customObj);
		expect(deserialized).toEqual(customObj);
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
		const serialized = serializeValue(array);
		const deserialized = deserializeValue(serialized);
		expect(deserialized).toEqual(array);
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
		const serialized = serializeValue(obj);
		const deserialized = deserializeValue(serialized);
		expect(deserialized).toEqual(obj);
	});

	it("should handle circular references", () => {
		const obj: any = {
			a: 1,
			b: 2,
			c: {
				d: 3,
				e: 4,
			},
		};
		obj.circular = obj;
		obj.c.parent = obj;
		obj.c.self = obj.c;

		const serialized = serializeValue(obj);
		const deserialized = deserializeValue(serialized);

		expect(deserialized.a).toBe(1);
		expect(deserialized.b).toBe(2);
		expect(deserialized.c.d).toBe(3);
		expect(deserialized.c.e).toBe(4);

		expect(deserialized.circular).toBe(null);
		expect(deserialized.c.parent).toBe(null);
		expect(deserialized.c.self).toBe(null);
	});

	//it("benchmark: serialization of deeply nested structures", () => {
	//	// Create a deeply nested structure
	//	function createNestedObject(depth: number, breadth: number): any {
	//		if (depth <= 0) {
	//			return {
	//				num: Math.random(),
	//				str: "test",
	//				date: new Date(),
	//				set: new Set([1, 2, 3]),
	//				map: new Map([
	//					["a", 1],
	//					["b", 2],
	//				]),
	//				array: new Uint8Array([1, 2, 3, 4]),
	//				float: new Float32Array([1.1, 2.2, 3.3]),
	//			};
	//		}

	//		const obj: any = {};
	//		for (let i = 0; i < breadth; i++) {
	//			obj[`child${i}`] = createNestedObject(depth - 1, breadth);
	//		}
	//		return obj;
	//	}

	//	// Create test data with depth=5 and breadth=3
	//	// This creates 3^5 = 243 leaf nodes, each with 7 complex properties
	//	const deepObject = createNestedObject(5, 5);

	//	// Warm up
	//	for (let i = 0; i < 3; i++) {
	//		serializeValue(deepObject);
	//	}

	//	// Benchmark
	//	const iterations = 100;
	//	const start = performance.now();

	//	for (let i = 0; i < iterations; i++) {
	//		serializeValue(deepObject);
	//	}

	//	const end = performance.now();
	//	const avgMs = (end - start) / iterations;

	//	console.log(`Average serialization time: ${avgMs.toFixed(2)}ms`);
	//	console.log(`Object stats:
	//		- Depth: 5
	//		- Breadth: 3
	//		- Leaf nodes: 243
	//		- Complex properties per leaf: 7
	//		- Total complex values: ${3125 * 7}
	// `);
	//}, 100000);
});
