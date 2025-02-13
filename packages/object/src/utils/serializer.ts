import { encode, decode, ExtensionCodec } from "@msgpack/msgpack";

import { DRPStateEntry } from "../proto/drp/object/v1/object_pb.js";

const extensionCodec = new ExtensionCodec();

const SET_EXT_TYPE = 0; // Any in 0-127
extensionCodec.register({
	type: SET_EXT_TYPE,
	encode: (object: unknown): Uint8Array | null => {
		if (object instanceof Set) {
			return encode([...object], { extensionCodec });
		} else {
			return null;
		}
	},
	decode: (data: Uint8Array) => {
		const array = decode(data, { extensionCodec }) as Array<unknown>;
		return new Set(array);
	},
});

// Map<K, V>
const MAP_EXT_TYPE = 1; // Any in 0-127
extensionCodec.register({
	type: MAP_EXT_TYPE,
	encode: (object: unknown): Uint8Array | null => {
		if (object instanceof Map) {
			return encode([...object], { extensionCodec });
		} else {
			return null;
		}
	},
	decode: (data: Uint8Array) => {
		const array = decode(data, { extensionCodec }) as Array<[unknown, unknown]>;
		return new Map(array);
	},
});

const FLOAT_32_ARRAY_EXT_TYPE = 2; // Any in 0-127
extensionCodec.register({
	type: FLOAT_32_ARRAY_EXT_TYPE,
	encode: (object: unknown): Uint8Array | null => {
		if (object instanceof Float32Array) {
			return encode([...object], { extensionCodec });
		} else {
			return null;
		}
	},
	decode: (data: Uint8Array) => {
		const array = decode(data, { extensionCodec }) as Array<number>;
		return new Float32Array(array);
	},
});

/** Extracts all the case names from a oneOf field. */
type OneOfCases<T> = T extends { $case: infer U extends string } ? U : never;

/** Extracts the specific type of a oneOf case based on its field name */
type OneOfCase<T, K extends OneOfCases<T>> = T extends {
	$case: K;
	[key: string]: unknown;
}
	? T
	: never;

export function getSerializedValue(
	value: DRPStateEntry["value"]
): OneOfCase<NonNullable<DRPStateEntry["value"]>, "data"> | undefined {
	if (!value) return undefined;

	if (value.$case === "data") return value;
	if (value.$case === "object") return { $case: "data", value: serializeValue(value.value) };

	return undefined;
}

export function getDeserializedValue(
	value: DRPStateEntry["value"]
): OneOfCase<NonNullable<DRPStateEntry["value"]>, "object"> | undefined {
	if (!value) return undefined;

	if (value.$case === "data") return { $case: "object", value: deserializeValue(value.value) };
	if (value.$case === "object") return value;

	return undefined;
}

/**
 * Main entry point for serialization.
 * Converts any value into a Uint8Array using Protocol Buffers.
 */
function serializeValue(obj: unknown): Uint8Array {
	return encode(obj, { extensionCodec });
}

/**
 * Main entry point for deserialization.
 * Converts a Uint8Array back into the original value structure.
 */
function deserializeValue(value: Uint8Array): unknown {
	return decode(value, { extensionCodec });
}
