import { deserializeValue, serializeValue } from "@ts-drp/object";
import {
	DRPState,
	DRPStateEntry,
	DRPStateEntryOtherTheWire,
	DRPStateOtherTheWire,
} from "@ts-drp/types";

export function serializeStateMessage(state?: DRPState): DRPStateOtherTheWire {
	const drpState = DRPStateOtherTheWire.create();
	for (const e of state?.state ?? []) {
		const entry = DRPStateEntryOtherTheWire.create({
			key: e.key,
			data: serializeValue(e.value),
		});
		drpState.state.push(entry);
	}
	return drpState;
}

export function deserializeStateMessage(state?: DRPStateOtherTheWire): DRPState {
	const drpState = DRPState.create();

	for (const e of state?.state ?? []) {
		const entry = DRPStateEntry.create({
			key: e.key,
			value: deserializeValue(e.data),
		});
		drpState.state.push(entry);
	}
	return drpState;
}
