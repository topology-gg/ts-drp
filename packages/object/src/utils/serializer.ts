import { Value } from "../proto/google/protobuf/struct_pb.js";

export function serializeValue(obj: any): Uint8Array {
	const serialized = _serializeToJSON(obj);
	return Value.encode(Value.wrap(serialized)).finish();
}

export function deserializeValue(value: any): any {
	const bytes = new Uint8Array(_objectValues(value))
	const v = Value.decode(bytes);
	const unwrapped = Value.unwrap(v);
	return _deserializeFromJSON(unwrapped);
}

function _objectValues(obj: any): any[] {
	const tmp: any[] = [];
	for (const key in obj) {
		tmp.push(obj[key]);
	}
	return tmp;
}

function _serializeToJSON(obj: any): any {
	// Handle null/undefined
	if (obj == null) return null;

	// Handle primitive types
	if (typeof obj !== "object") return obj;

	// Handle Date objects
	if (obj instanceof Date) {
		return {
			__type: "Date",
			value: obj.toISOString(),
		};
	}

	// Handle Maps
	if (obj instanceof Map) {
		return {
			__type: "Map",
			value: Array.from(obj.entries()),
		};
	}

	// Handle Sets
	if (obj instanceof Set) {
		return {
			__type: "Set",
			value: Array.from(obj.values()),
		};
	}

	// Handle regular arrays
	if (Array.isArray(obj)) {
		return obj.map((item) => _serializeToJSON(item));
	}

	// Handle regular objects
	const result: any = {};
	for (const [key, value] of Object.entries(obj)) {
		// Skip non-enumerable properties and functions
		if (typeof value === "function") continue;

		// Handle circular references
		try {
			result[key] = _serializeToJSON(value);
		} catch (e) {
			console.warn(`Circular reference detected for key: ${key}`);
			result[key] = null;
		}
	}

	// Add class name if available
	if (obj.constructor && obj.constructor.name !== "Object") {
		result.__type = obj.constructor.name;
	}

	return result;
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
					obj.value.map(([k, v]: [any, any]) => [
						_deserializeFromJSON(k),
						_deserializeFromJSON(v),
					]),
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
							_deserializeFromJSON({ ...obj, __type: undefined }),
						);
					}
				} catch (e) {
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
