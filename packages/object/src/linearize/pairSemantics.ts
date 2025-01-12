import {
	ActionType,
	type Hash,
	type HashGraph,
	type Operation,
} from "../hashgraph/index.js";
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
				action = hashGraph.resolveConflicts([v1, v2]).action;
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

		if (!dropped[i]) {
			const op = hashGraph.vertices.get(order[i])?.operation;
			if (op && op.value !== null) result.push(op);
		}
		i++;
	}

	return result;
}
