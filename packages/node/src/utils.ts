import { encode, decode } from "@msgpack/msgpack";
import { ObjectPb } from "@ts-drp/object";

export function serializeStateMessage(state?: ObjectPb.DRPState): ObjectPb.DRPState {
	const drpState = ObjectPb.DRPState.create();
	for (const e of state?.state ?? []) {
		const entry = ObjectPb.DRPStateEntry.create({
			key: e.key,
			value: encode(e.value),
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
			value: decode(e.value),
		});
		drpState.state.push(entry);
	}
	return drpState;
}
