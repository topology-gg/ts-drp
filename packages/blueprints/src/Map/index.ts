import {
	ActionType,
	type DRP,
	type ResolveConflictsType,
	SemanticsType,
	type Vertex,
} from "@ts-drp/object";

export enum MapConflictResolution {
	UpdateWins = 0,
	RemoveWins = 1,
}

export class ConflictResolvingMap<K, V> implements DRP {
	semanticsType = SemanticsType.pair;

	private _conflictResolution: MapConflictResolution;
	private _map: Map<K, V>;

	constructor(conflictResolution?: MapConflictResolution) {
		this._map = new Map();
		this._conflictResolution =
			conflictResolution ?? MapConflictResolution.UpdateWins;
	}

	update(key: K, value: V): void {
		this._map.set(key, value);
	}

	remove(key: K): void {
		this._map.delete(key);
	}

	query_has(key: K): boolean {
		return this._map.has(key);
	}

	query_get(key: K): V | undefined {
		return this._map.get(key);
	}

	resolveConflicts(vertices: Vertex[]): ResolveConflictsType {
		if (!vertices[0].operation || !vertices[1].operation) {
			return { action: ActionType.Nop };
		}
		const values0 = Array.isArray(vertices[0].operation.value)
			? vertices[0].operation.value
			: [vertices[0].operation.value];

		const values1 = Array.isArray(vertices[1].operation.value)
			? vertices[1].operation.value
			: [vertices[1].operation.value];
		if (
			vertices[0].operation.type === vertices[1].operation.type ||
			values0[0] !== values1[0]
		) {
			return { action: ActionType.Nop };
		}

		return this._conflictResolution === MapConflictResolution.UpdateWins
			? {
					action:
						vertices[0].operation.type === "update"
							? ActionType.DropRight
							: ActionType.DropLeft,
				}
			: {
					action:
						vertices[0].operation.type === "update"
							? ActionType.DropLeft
							: ActionType.DropRight,
				};
	}
}
