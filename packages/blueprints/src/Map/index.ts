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

	async computeHash(data: string): Promise<string> {
		const encoder = new TextEncoder();
		const encodedData = encoder.encode(data);
		const hashBuffer = await crypto.subtle.digest("SHA-256", encodedData);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
	}

	resolveConflicts(vertices: Vertex[]): ResolveConflictsType {
		if (!vertices[0].operation || !vertices[1].operation) {
			return { action: ActionType.Nop };
		}

		const values0 = vertices[0].operation.value;
		const values1 = vertices[1].operation.value;

		if (
			// if both are revoke operations, return no-op
			vertices[0].operation.type === "revoke" &&
			vertices[1].operation.type === "revoke"
		) {
			return { action: ActionType.Nop };
		}

		if (
			vertices[0].operation.type === "update" &&
			vertices[1].operation.type === "update"
		) {
			// if both are updates, keep operation with higher hash value
			const hash0 = this.computeHash(JSON.stringify(values0[1]));
			const hash1 = this.computeHash(JSON.stringify(values1[1]));
			return hash0 > hash1
				? { action: ActionType.DropRight }
				: { action: ActionType.DropLeft };
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
