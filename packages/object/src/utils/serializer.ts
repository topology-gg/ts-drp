/* eslint-disable @typescript-eslint/no-explicit-any */
import { Value } from "../proto/google/protobuf/struct_pb.js";

/**
 * Represents an item that needs to be finalized after deserialization.
 * Used for Map and Set reconstruction from temporary arrays.
 */
type FinalizerItem = {
	target: any[]; // Temporary array holding Map entries or Set values
	type: "Map" | "Set"; // Type of collection to create
};

/**
 * Represents an item in the serialization/deserialization stack.
 * Used to track parent-child relationships during processing.
 */
type StackItem = {
	parent: any; // The parent object/array that will contain this value
	key: string | number | null; // The key/index where this value belongs in the parent
	value: any; // The value to be processed
};

/**
 * Represents a serialized value in our custom format.
 * Either an array or an object with type information.
 */
type SerializedValue = any[] | { __type: string; value: any };

/**
 * Interface for type-specific serializers.
 * Each serializer knows how to check for and serialize a specific type.
 */
interface TypeSerializer {
	check: (obj: any) => boolean; // Determines if this serializer can handle the object
	serialize: (obj: any, stack: StackItem[]) => SerializedValue; // Converts object to serializable form
}

/**
 * Main entry point for serialization.
 * Converts any value into a Uint8Array using Protocol Buffers.
 */
export function serializeValue(obj: any): Uint8Array {
	const serialized = _serializeToJSON(obj);
	return Value.encode(Value.wrap(serialized)).finish();
}

/**
 * Main entry point for deserialization.
 * Converts a Uint8Array back into the original value structure.
 */
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

/**
 * Serializes an object to a JSON-like structure
 * Handles:
 * - Primitive types
 * - Arrays
 * - Objects
 * - Special types like Date, Uint8Array, Float32Array
 * - Custom class
 * - Circular references
 */
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

/**
 * Advanced JSON deserializer that handles complex object types
 * Supports:
 * - Primitive types
 * - Arrays
 * - Objects
 * - Special types like Date, Uint8Array, Float32Array
 * - Custom class reconstruction
 * - Map and Set reconstructions
 * - Circular references
 */
function _deserializeFromJSON(serialized: any): any {
	// Early return for primitives
	if (serialized === null || typeof serialized !== "object") {
		return serialized;
	}

	// Initialize root object based on input type
	let root: any = Array.isArray(serialized) ? [] : {};
	const stack: StackItem[] = [{ parent: null, key: null, value: serialized }];
	const seenObjects = new WeakMap();
	const finalizers: FinalizerItem[] = [];

	function assignValue(parent: any, key: string | number | null, value: any): void {
		if (parent === null) {
			root = value;
		} else if (key != null) {
			parent[key] = value;
		}
	}

	// Helper function to check if a value is an object
	function isObject(value: any): boolean {
		return value !== null && (typeof value === "object" || typeof value === "function");
	}

	while (stack.length > 0) {
		const item = stack.pop();
		if (!item) continue;

		const { parent, key, value } = item;
		let deserialized: any;

		if (!isObject(value)) {
			assignValue(parent, key, value);
			continue;
		}

		if (seenObjects.has(value)) {
			assignValue(parent, key, seenObjects.get(value));
			continue;
		}

		if (value.__type) {
			deserialized = handleSpecialTypes(value, stack, finalizers);
		} else if (Array.isArray(value)) {
			deserialized = [];
			for (let i = value.length - 1; i >= 0; i--) {
				stack.push({ parent: deserialized, key: i, value: value[i] });
			}
		} else {
			deserialized = {};
			for (const prop in value) {
				stack.push({ parent: deserialized, key: prop, value: value[prop] });
			}
		}

		seenObjects.set(value, deserialized);
		assignValue(parent, key, deserialized);
	}

	return processFinalizers(root, finalizers);
}

/**
 * Handle special type reconstructions
 */
function handleSpecialTypes(value: any, stack: StackItem[], finalizers: FinalizerItem[]): any {
	switch (value.__type) {
		case "Date":
			return new Date(value.value);

		case "Uint8Array":
			return new Uint8Array(value.value);

		case "Float32Array":
			return new Float32Array(value.value);

		case "Map": {
			const mapTemp: any[] = [];
			finalizers.push({ target: mapTemp, type: "Map" });

			if (Array.isArray(value.value)) {
				for (let i = value.value.length - 1; i >= 0; i--) {
					stack.push({ parent: mapTemp, key: i, value: value.value[i] });
				}
			}
			return mapTemp;
		}
		case "Set": {
			const setTemp: any[] = [];
			finalizers.push({ target: setTemp, type: "Set" });

			if (Array.isArray(value.value)) {
				for (let i = value.value.length - 1; i >= 0; i--) {
					stack.push({ parent: setTemp, key: i, value: value.value[i] });
				}
			}
			return setTemp;
		}
		default:
			return reconstructCustomClass(value, stack);
	}
}

/**
 * Attempt to reconstruct custom classes
 */
function reconstructCustomClass(value: any, stack: StackItem[]): any {
	try {
		const CustomClass = globalThis[value.__type as keyof typeof globalThis];

		if (typeof CustomClass === "function") {
			const instance = new CustomClass();
			const { __type, ...clone } = value;

			for (const [prop, propVal] of Object.entries(clone)) {
				stack.push({ parent: instance, key: prop, value: propVal });
			}

			return instance;
		}
	} catch {
		console.warn(`Could not reconstruct class ${value.__type}`);
	}

	return {};
}

/**
 * Replace temporary arrays with actual Map and Set instances
 */
function processFinalizers(root: any, finalizers: FinalizerItem[]): any {
	for (let i = finalizers.length - 1; i >= 0; i--) {
		const finalizer = finalizers[i];

		if (finalizer.type === "Map") {
			const mapInstance = new Map(
				finalizer.target.filter((pair) => Array.isArray(pair) && pair.length === 2)
			);
			root = replaceFinalizerTarget(root, finalizer.target, mapInstance);
		} else if (finalizer.type === "Set") {
			const setInstance = new Set(finalizer.target);
			root = replaceFinalizerTarget(root, finalizer.target, setInstance);
		}
	}

	return root;
}

/**
 * Recursively replace temporary arrays with their final Map/Set instances
 */
function replaceFinalizerTarget(root: any, target: any, replacement: any): any {
	if (root === target) return replacement;

	const stack = [root];
	while (stack.length > 0) {
		const current = stack.pop();

		if (current && typeof current === "object") {
			for (const key in current) {
				if (current[key] === target) {
					current[key] = replacement;
				} else if (typeof current[key] === "object" && current[key] !== null) {
					stack.push(current[key]);
				}
			}
		}
	}

	return root;
}
