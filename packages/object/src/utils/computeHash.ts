import * as crypto from "node:crypto";

import type { Hash } from "../hashgraph/index.js";
import type { Vertex_Operation as Operation } from "../proto/drp/object/v1/object_pb.js";

export function computeHash(
	peerId: string,
	operation: Operation | undefined,
	deps: Hash[],
	timestamp: number
): Hash {
	const serialized = JSON.stringify({ operation, deps, peerId, timestamp });
	const hash = crypto.createHash("sha256").update(serialized).digest("hex");
	return hash;
}
