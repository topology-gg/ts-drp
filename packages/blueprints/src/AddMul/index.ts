import {
	ActionType,
	type DRP,
	type ResolveConflictsType,
	SemanticsType,
	type Vertex,
} from "@ts-drp/object";

export class AddMulDRP implements DRP {
	semanticsType = SemanticsType.pair;

	private _value: number = 0;

	add(value: number): void {
		this._value += value;
	}

	mul(value: number): void {
		this._value *= value;
	}

	query_value(): number {
		return this._value;
	}

	resolveConflicts(vertices: Vertex[]): ResolveConflictsType {
		if (vertices.length < 2 || vertices[0].hash === vertices[1].hash) {
			return { action: ActionType.Nop };
		}

		const [left, right] = vertices;
		const leftOp = left.operation?.opType ?? "";
		const rightOp = right.operation?.opType ?? "";
		const leftContent = left.operation?.value?.[0] ?? 0;
		const rightContent = right.operation?.value?.[0] ?? 0;

		if (
			leftOp === rightOp &&
			(left.peerId > right.peerId || (left.peerId === right.peerId && leftContent < rightContent))
		) {
			return { action: ActionType.Swap };
		}

		if (leftOp === "mul" && rightOp === "add") {
			return { action: ActionType.Swap };
		}

		return { action: ActionType.Nop };
	}
}
