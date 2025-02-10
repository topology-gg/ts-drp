/* eslint-disable @typescript-eslint/no-explicit-any */
import { Value } from "../proto/google/protobuf/struct_pb.js";

export function serializeValue(obj: any): Uint8Array {
	const serialized = _serializeToJSON(obj);
	return Value.encode(Value.wrap(serialized)).finish();
}

export function deserializeValue(value: any): any {
	const bytes = new Uint8Array(_objectValues(value));
	const decoded = Value.decode(bytes);
	const unwrapped = Value.unwrap(decoded);
	return _deserializeFromJSON(unwrapped);
}

function _objectValues(obj: any): any[] {
	const tmp: any[] = [];
	for (const key in obj) {
		tmp.push(obj[key]);
	}
	return tmp;
}

type StackItem = {
	parent: any;
	key: string | number | null;
	value: any;
};

type SerializedValue = any[] | { __type: string; value: any };

interface TypeSerializer {
	check: (obj: any) => boolean;
	serialize: (obj: any, stack: StackItem[]) => SerializedValue;
}

function _serializeDate(date: Date): SerializedValue {
	return { __type: "Date", value: date.toISOString() };
}

function _serializeMap(map: Map<any, any>, stack: StackItem[]): SerializedValue {
	const result = { __type: "Map", value: [] as any[] };
	for (const [k, v] of map.entries()) {
		result.value.push([undefined, undefined]);
		const pairIndex = result.value.length - 1;
		// Push the value first so that the key gets processed later.
		stack.push({ parent: result.value[pairIndex], key: 1, value: v });
		stack.push({ parent: result.value[pairIndex], key: 0, value: k });
	}
	return result;
}

function _serializeSet(set: Set<any>, stack: StackItem[]): SerializedValue {
	const result = { __type: "Set", value: [] as any[] };
	for (const item of set.values()) {
		result.value.push(undefined);
		const idx = result.value.length - 1;
		stack.push({ parent: result.value, key: idx, value: item });
	}
	return result;
}

function _serializeUint8Array(arr: Uint8Array): SerializedValue {
	return { __type: "Uint8Array", value: Array.from(arr) };
}

function _serializeFloat32Array(arr: Float32Array): SerializedValue {
	return { __type: "Float32Array", value: Array.from(arr) };
}

function _serializeArray(arr: any[], stack: StackItem[]): SerializedValue {
	const result: any[] = [];
	for (let i = arr.length - 1; i >= 0; i--) {
		stack.push({ parent: result, key: i, value: arr[i] });
	}
	return result;
}

const typeSerializers: TypeSerializer[] = [
	{ check: (obj: any) => obj instanceof Date, serialize: _serializeDate },
	{ check: (obj: any) => obj instanceof Map, serialize: _serializeMap },
	{ check: (obj: any) => obj instanceof Set, serialize: _serializeSet },
	{ check: (obj: any) => obj instanceof Uint8Array, serialize: _serializeUint8Array },
	{ check: (obj: any) => obj instanceof Float32Array, serialize: _serializeFloat32Array },
	{ check: (obj: any) => Array.isArray(obj), serialize: _serializeArray },
];

function _serializeToJSON(obj: any): any {
	if (obj === null || typeof obj !== "object") return obj;

	let root: any = Array.isArray(obj) ? [] : {};
	const stack: StackItem[] = [{ parent: null, key: null, value: obj }];
	const seen = new WeakMap();

	function assignValue(parent: any, key: string | number | null, value: any): void {
		if (parent === null) root = value;
		else if (Array.isArray(parent)) parent[key as number] = value;
		else parent[key as string] = value;
	}

	while (stack.length > 0) {
		const item = stack.pop();
		if (!item) continue; // should never happen
		const { parent, key, value } = item;

		if (value === null || typeof value !== "object") {
			assignValue(parent, key, value);
			continue;
		}

		if (seen.has(value)) {
			console.warn("Circular reference detected; substituting with null.");
			assignValue(parent, key, null);
			continue;
		}
		seen.set(value, true);

		const serializer = typeSerializers.find((s) => s.check(value));
		if (serializer) {
			assignValue(parent, key, serializer.serialize(value, stack));
			continue;
		}

		const serialized: any = {};
		if (value.constructor && value.constructor.name !== "Object") {
			serialized.__type = value.constructor.name;
		}

		const entries = Object.entries(value).filter(([, v]) => typeof v !== "function");
		for (let i = entries.length - 1; i >= 0; i--) {
			const [prop, propVal] = entries[i];
			stack.push({ parent: serialized, key: prop, value: propVal });
		}
		assignValue(parent, key, serialized);
	}
	return root;
}

function _deserializeFromJSON(obj: any): any {
	// Handle null/undefined
	if (obj == null) return obj;

	// Handle primitive types
	if (typeof obj !== "object") return obj;

	// Handle arrays
	if (Array.isArray(obj)) {
		return obj.map((item) => _deserializeFromJSON(item));
	}

	// Handle special types
	if (obj.__type) {
		switch (obj.__type) {
			case "Date":
				return new Date(obj.value);

			case "Map":
				return new Map(
					obj.value.map(([k, v]: [any, any]) => [_deserializeFromJSON(k), _deserializeFromJSON(v)])
				);

			case "Set":
				return new Set(obj.value.map((v: any) => _deserializeFromJSON(v)));

			case "Uint8Array":
				return new Uint8Array(obj.value);

			case "Float32Array":
				return new Float32Array(obj.value);

			// Add other TypedArrays as needed

			default:
				// Try to reconstruct custom class if available
				try {
					const CustomClass = globalThis[obj.__type as keyof typeof globalThis];
					if (typeof CustomClass === "function") {
						return Object.assign(
							new CustomClass(),
							_deserializeFromJSON({ ...obj, __type: undefined })
						);
					}
				} catch (_) {
					console.warn(`Could not reconstruct class ${obj.__type}`);
				}
		}
	}

	// Handle regular objects
	const result: any = {};
	for (const [key, value] of Object.entries(obj)) {
		if (key !== "__type") {
			result[key] = _deserializeFromJSON(value);
		}
	}

	return result;
}
