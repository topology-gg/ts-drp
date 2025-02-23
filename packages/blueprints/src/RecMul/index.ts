import {
	ActionType,
	type DRP,
	type ResolveConflictsType,
	SemanticsType,
	type Vertex,
} from "@ts-drp/object";

export class RecMulDRP implements DRP {
	semanticsType = SemanticsType.pair;

	private _value: number;

	constructor(initialValue?: number) {
		if (typeof initialValue === "number") {
			this._value = initialValue;
		} else {
			this._value = 1;
		}
	}

	recursive_mul(value: number): void {
		if (typeof value !== "number") {
			return;
		}
		if (value === 0) {
			return;
		}
		this._value = this._multiply(value, this._value);
	}

	private _multiply(value: number, base: number): number {
		if (value === 1) return base; // Base case
		return base + this._multiply(value - 1, base);
	}

	query_value(): number {
		return this._value;
	}

	resolveConflicts(_: Vertex[]): ResolveConflictsType {
		return { action: ActionType.Nop };
	}
}
