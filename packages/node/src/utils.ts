import { ObjectPb, deserializeValue, serializeValue } from "@ts-drp/object";

export function serializeStateMessage(state?: ObjectPb.DRPState): ObjectPb.DRPState {
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

export function deserializeStateMessage(state?: ObjectPb.DRPState): ObjectPb.DRPState {
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

export async function verifyACLSignature(
	publicKeyBytes: Uint8Array<ArrayBufferLike>,
	signature: Uint8Array<ArrayBufferLike>,
	data: Uint8Array<ArrayBufferLike>,
) {
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		publicKeyBytes,
		{ name: "Ed25519" },
		true,
		["verify"],
	);

	const isValid = await crypto.subtle.verify(
		{ name: "Ed25519" },
		cryptoKey,
		signature,
		data,
	);

	return isValid;
}
