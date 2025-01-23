import { ObjectPb, deserializeValue, serializeValue } from "@ts-drp/object";

export function serializeStateMessage(
	state?: ObjectPb.DRPState,
): ObjectPb.DRPState {
	const drpState = ObjectPb.DRPState.create();
	for (const e of state?.state ?? []) {
		const entry = ObjectPb.DRPStateEntry.create({
			key: e.key,
			value: serializeValue(e.value),
		});
		drpState.state.push(entry);
	}
	return drpState;
}

export function deserializeStateMessage(
	state?: ObjectPb.DRPState,
): ObjectPb.DRPState {
	const drpState = ObjectPb.DRPState.create();
	for (const e of state?.state ?? []) {
		const entry = ObjectPb.DRPStateEntry.create({
			key: e.key,
			value: deserializeValue(e.value),
		});
		drpState.state.push(entry);
	}
	return drpState;
}
