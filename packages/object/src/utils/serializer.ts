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

const typeSerializers: TypeSerializer[] = [
	{ check: (obj: any) => obj instanceof Date, serialize: _serializeDate },
	{ check: (obj: any) => obj instanceof Map, serialize: _serializeMap },
	{ check: (obj: any) => obj instanceof Set, serialize: _serializeSet },
	{ check: (obj: any) => obj instanceof Uint8Array, serialize: _serializeUint8Array },
	{ check: (obj: any) => obj instanceof Float32Array, serialize: _serializeFloat32Array },
	{ check: (obj: any) => Array.isArray(obj), serialize: _serializeArray },
];

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

/**
 * Extracts all values from an object into an array.
 * Used to convert object-like Uint8Array representations into actual arrays
 * that can be used to construct Uint8Arrays.
 * 
 * @example
 * _objectValues({0: 1, 1: 2, 2: 3}) // returns [1, 2, 3]
 * 
 * @param obj - The object to extract values from
 * @returns An array containing all values from the object
 */
function _objectValues(obj: any): any[] {
	const tmp: any[] = [];
	for (const key in obj) {
		tmp.push(obj[key]);
	}
	return tmp;
}

/**
 * Serializes a Date object into our custom format
 * Converts the date to ISO string for reliable reconstruction
 * 
 * @param date - The Date object to serialize
 * @returns A serialized representation with type information
 */
function _serializeDate(date: Date): SerializedValue {
	return { __type: "Date", value: date.toISOString() };
}

/**
 * Serializes a Map into our custom format
 * Handles nested structures by pushing key-value pairs onto the processing stack
 * 
 * @param map - The Map to serialize
 * @param stack - The processing stack for handling nested structures
 * @returns A serialized representation with type information
 */
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

/**
 * Serializes a Set into our custom format
 * Handles nested structures by pushing items onto the processing stack
 * 
 * @param set - The Set to serialize
 * @param stack - The processing stack for handling nested structures
 * @returns A serialized representation with type information
 */
function _serializeSet(set: Set<any>, stack: StackItem[]): SerializedValue {
	const result = { __type: "Set", value: [] as any[] };
	for (const item of set.values()) {
		result.value.push(undefined);
		const idx = result.value.length - 1;
		stack.push({ parent: result.value, key: idx, value: item });
	}
	return result;
}

/**
 * Serializes a Uint8Array into our custom format
 * Converts the typed array to a regular array for JSON compatibility
 * 
 * @param arr - The Uint8Array to serialize
 * @returns A serialized representation with type information
 */
function _serializeUint8Array(arr: Uint8Array): SerializedValue {
	return { __type: "Uint8Array", value: Array.from(arr) };
}

/**
 * Serializes a Float32Array into our custom format
 * Converts the typed array to a regular array for JSON compatibility
 * 
 * @param arr - The Float32Array to serialize
 * @returns A serialized representation with type information
 */
function _serializeFloat32Array(arr: Float32Array): SerializedValue {
	return { __type: "Float32Array", value: Array.from(arr) };
}

/**
 * Serializes an Array into our custom format
 * Handles nested structures by pushing items onto the processing stack
 * 
 * @param arr - The Array to serialize
 * @param stack - The processing stack for handling nested structures
 * @returns The serialized array (no type information needed as it's a native JSON type)
 */
function _serializeArray(arr: any[], stack: StackItem[]): SerializedValue {
	const result: any[] = [];
	for (let i = arr.length - 1; i >= 0; i--) {
		stack.push({ parent: result, key: i, value: arr[i] });
	}
	return result;
}

/**
 * Serializes any JavaScript value into a JSON-compatible structure
 * Handles complex types by converting them to a special format with type information
 * 
 * @example
 * // Simple object
 * _serializeToJSON({ a: 1, b: "test" })
 * // Returns: { a: 1, b: "test" }
 * 
 * // Date object
 * _serializeToJSON(new Date("2024-01-01"))
 * // Returns: { __type: "Date", value: "2024-01-01T00:00:00.000Z" }
 * 
 * // Complex object with special types
 * _serializeToJSON({
 *   date: new Date("2024-01-01"),
 *   map: new Map([["key", "value"]]),
 *   set: new Set([1, 2, 3])
 * })
 * // Returns: {
 * //   date: { __type: "Date", value: "2024-01-01T00:00:00.000Z" },
 * //   map: { __type: "Map", value: [["key", "value"]] },
 * //   set: { __type: "Set", value: [1, 2, 3] }
 * // }
 * 
 * @param obj - The value to serialize
 * @returns A JSON-compatible representation of the value
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
 * Deserializes a value from our custom JSON format back into its original form
 * Reconstructs complex types from their serialized representations
 * 
 * @example
 * // Simple object
 * _deserializeFromJSON({ a: 1, b: "test" })
 * // Returns: { a: 1, b: "test" }
 * 
 * // Date object
 * _deserializeFromJSON({ __type: "Date", value: "2024-01-01T00:00:00.000Z" })
 * // Returns: Date<2024-01-01T00:00:00.000Z>
 * 
 * // Complex object with special types
 * _deserializeFromJSON({
 *   date: { __type: "Date", value: "2024-01-01T00:00:00.000Z" },
 *   map: { __type: "Map", value: [["key", "value"]] },
 *   set: { __type: "Set", value: [1, 2, 3] }
 * })
 * // Returns: {
 * //   date: Date<2024-01-01T00:00:00.000Z>,
 * //   map: Map<string, string>(1) { "key" => "value" },
 * //   set: Set<number>(3) { 1, 2, 3 }
 * // }
 * 
 * // Custom class
 * class Person { constructor(public name: string) {} }
 * globalThis.Person = Person;
 * _deserializeFromJSON({ __type: "Person", name: "John" })
 * // Returns: Person { name: "John" }
 * 
 * @param serialized - The serialized value to deserialize
 * @returns The reconstructed value with all special types restored
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
 * Handles special type reconstructions during deserialization
 * Processes Date, TypedArrays, Map, Set, and custom class instances
 * 
 * @param value - The value containing type information to reconstruct
 * @param stack - The processing stack for handling nested structures
 * @param finalizers - Collection of Map/Set temporary arrays that need post-processing
 * @returns The reconstructed object or a temporary array for Maps/Sets
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
 * Attempts to reconstruct instances of custom classes
 * Looks up the class in globalThis and creates a new instance with the serialized properties
 * 
 * @param value - The serialized object with type information
 * @param stack - The processing stack for handling nested properties
 * @returns A new instance of the custom class or an empty object if reconstruction fails
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
 * Processes temporary arrays into their final Map/Set instances
 * Called after the main deserialization to finalize all collections
 * 
 * @param root - The root object containing temporary arrays
 * @param finalizers - Collection of temporary arrays to convert to Map/Set
 * @returns The root object with all collections properly reconstructed
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
 * Recursively replaces all references to a temporary array with its final Map/Set instance
 * Traverses the entire object tree to ensure all references are updated
 * 
 * @param root - The root object to traverse
 * @param target - The temporary array to replace
 * @param replacement - The final Map/Set instance
 * @returns The root object with all references updated
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
