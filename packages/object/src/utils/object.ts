import * as crypto from "node:crypto";

export function computeDRPObjectId(peerId: string): string {
	return crypto
		.createHash("sha256")
		.update(peerId)
		.update(Math.floor(Math.random() * Number.MAX_VALUE).toString())
		.digest("hex");
}
