import { ObjectPb, getDeserializedValue, getSerializedValue } from "@ts-drp/object";

/** Extracts all the case names from a oneOf field. */
type OneOfCases<T> = T extends { $case: infer U extends string } ? U : never;

/** Extracts a union of all the value types from a oneOf field */
export type OneOfValues<T> = T extends { $case: infer U extends string; [key: string]: unknown }
	? T[U]
	: never;

/** Extracts the specific type of a oneOf case based on its field name */
export type OneOfCase<T, K extends OneOfCases<T>> = T extends {
	$case: K;
	[key: string]: unknown;
}
	? T
	: never;

/** Extracts the specific type of a value type from a oneOf field */
export type OneOfValue<T, K extends OneOfCases<T>> = T extends {
	$case: infer U extends K;
	[key: string]: unknown;
}
	? T[U]
	: never;

export function getDRPStateEntryValue<T extends OneOfCases<ObjectPb.DRPStateEntry["value"]>>(
	entry: ObjectPb.DRPStateEntry | ObjectPb.DRPStateEntry["value"]
): OneOfValue<NonNullable<ObjectPb.DRPStateEntry["value"]>, T> {
	if (!entry) throw new Error("entry is undefined");
	const value = "value" in entry ? entry.value : entry;
	return value?.$case === "object" ? value.value : value;
}

export function serializeStateMessage(state?: ObjectPb.DRPState): ObjectPb.DRPState {
	const drpState = ObjectPb.DRPState.create();
	for (const e of state?.state ?? []) {
		const entry = ObjectPb.DRPStateEntry.create({
			key: e.key,
			value: getSerializedValue(e.value),
		});
		drpState.state.push(entry);
	}
	return drpState;
}

export function deserializeStateMessage(state?: ObjectPb.DRPState): ObjectPb.DRPState {
	const drpState = ObjectPb.DRPState.create();

	for (const e of state?.state ?? []) {
		const entry = ObjectPb.DRPStateEntry.create({
			key: e.key,
			value: getDeserializedValue(e.value),
		});
		drpState.state.push(entry);
	}
	return drpState;
}
