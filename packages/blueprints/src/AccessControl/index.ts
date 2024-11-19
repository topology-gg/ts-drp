import {
	ActionType,
	type CRO,
	type Operation,
	type ResolveConflictsType,
	SemanticsType,
	type Vertex,
} from "@topology-foundation/object";

enum ConflictResolution {
	GrantWins = 0,
	RevokeWins = 1,
}

export class AccessControl implements CRO {
	operations: Set<string> = new Set(["grant", "revoke"]);
	semanticsType = SemanticsType.pair;

	private _conflictResolution: ConflictResolution;
	private _admins: Set<string>;
	private _writers: Set<string>;

	constructor(admins: string[], conflictResolution?: ConflictResolution) {
		this._admins = new Set(admins);
		this._writers = new Set(admins)
		this._conflictResolution =
			conflictResolution ?? ConflictResolution.RevokeWins;
	}

	private _grant(nodeId: string): void {
		this._writers.add(nodeId);
	}

	grant(nodeId: string): void {
		this._grant(nodeId);
	}

	private _revoke(nodeId: string): void {
		this._writers.delete(nodeId);
	}

	revoke(nodeId: string): void {
		if (!this.isAdmin(nodeId))
			throw new Error("Invoker is not in the admin set.");
		this._revoke(nodeId);
	}

	isAdmin(nodeId: string): boolean {
		return this._admins.has(nodeId);
	}

	isWriter(nodeId: string): boolean {
		return this._writers.has(nodeId);
	}

	resolveConflicts(vertices: Vertex[]): ResolveConflictsType {
		if (!vertices[0].operation || !vertices[1].operation) return { action: ActionType.Nop };
		if (
			vertices[0].operation?.type === vertices[1].operation?.type ||
			vertices[0].operation?.value !== vertices[1].operation?.value
		) return { action: ActionType.Nop };

		return vertices[0].operation.type === "grant"
			? {
				action:
					this._conflictResolution === ConflictResolution.GrantWins
						? ActionType.DropRight
						: ActionType.DropLeft,
			}
			: {
				action:
					this._conflictResolution === ConflictResolution.GrantWins
						? ActionType.DropLeft
						: ActionType.DropRight,
			};
	}

	// merged at HG level and called as a callback
	mergeCallback(operations: Operation[]): void {
		this._writers = new Set();
		for (const op of operations) {
			switch (op.type) {
				case "grant":
					if (op.value !== null) this._grant(op.value);
					break;
				case "revoke":
					if (op.value !== null) this._revoke(op.value);
					break;
				default:
					break;
			}
		}
	}
}
