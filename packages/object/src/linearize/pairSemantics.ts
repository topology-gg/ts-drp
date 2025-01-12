import {
	ActionType,
	type Hash,
	type HashGraph,
	type Operation,
} from "../hashgraph/index.js";
import { VertexTypeOperation } from "../index.js";
import type { ObjectSet } from "../utils/objectSet.js";

export function linearizePairSemantics(
	hashGraph: HashGraph,
	origin: Hash,
	subgraph: ObjectSet<string>,
): Operation[] {
	const order: Hash[] = hashGraph.topologicalSort(true, origin, subgraph);
	const dropped = new Array(order.length).fill(false);
	const result = [];
	// alway remove the first operation
	let i = 1;

	while (i < order.length) {
		if (dropped[i]) {
			i++;
			continue;
		}
		const anchor = order[i];
		let j = i + 1;

		const begin = Date.now();

		while (j < order.length) {
			if (
				hashGraph.areCausallyRelatedUsingBitsets(anchor, order[j]) ||
				dropped[j]
			) {
				j++;
				continue;
			}
			const moving = order[j];

			const v1 = hashGraph.vertices.get(anchor);
			const v2 = hashGraph.vertices.get(moving);
			let action: ActionType;
			if (!v1 || !v2) {
				action = ActionType.Nop;
			} else {
				if (v1.operation?.vertexType === VertexTypeOperation.acl || v2.operation?.vertexType === VertexTypeOperation.acl) {
					action = hashGraph.resolveConflictsACL([v1, v2]).action;
				} else {
					action = hashGraph.resolveConflictsDRP([v1, v2]).action
				}
			}

			switch (action) {
				case ActionType.DropLeft:
					dropped[i] = true;
					j = order.length;
					break;
				case ActionType.DropRight:
					dropped[j] = true;
					j++;
					break;
				case ActionType.Swap:
					[order[i], order[j]] = [order[j], order[i]];
					j = i + 1;
					break;
				case ActionType.Nop:
					j++;
					break;
			}
		}

		const end = Date.now();
		if (end - begin > 10) {
			console.log("long time", end - begin);
		}

		if (!dropped[i]) {
			const op = hashGraph.vertices.get(order[i])?.operation;
			if (op && op.value !== null) result.push(op);
		}
		i++;
	}

	return result;
}
