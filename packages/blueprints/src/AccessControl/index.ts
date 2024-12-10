import {
	ActionType,
	type DRP,
	type ResolveConflictsType,
	SemanticsType,
	type Vertex,
} from "@ts-drp/object";

export enum AccessControlConflictResolution {
	GrantWins = 0,
	RevokeWins = 1,
}

export class AccessControl implements DRP {
	operations: string[] = ["grant", "revoke"];
	semanticsType = SemanticsType.pair;

	private _conflictResolution: AccessControlConflictResolution;
	private _admins: Set<string>;
	private _writers: Set<string>;

	constructor(
		admins: string[],
		conflictResolution?: AccessControlConflictResolution,
	) {
		this._admins = new Set(admins);
		this._writers = new Set(admins);
		this._conflictResolution =
			conflictResolution ?? AccessControlConflictResolution.RevokeWins;
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
		if (this.isAdmin(nodeId))
			throw new Error(
				"Cannot revoke permissions from a node with admin privileges.",
			);
		this._revoke(nodeId);
	}

	isAdmin(nodeId: string): boolean {
		return this._admins.has(nodeId);
	}

	isWriter(nodeId: string): boolean {
		return this._writers.has(nodeId);
	}

	resolveConflicts(vertices: Vertex[]): ResolveConflictsType {
		if (!vertices[0].operation || !vertices[1].operation)
			return { action: ActionType.Nop };
		if (
			vertices[0].operation.type === vertices[1].operation.type ||
			vertices[0].operation.value !== vertices[1].operation.value
		)
			return { action: ActionType.Nop };

		return this._conflictResolution ===
			AccessControlConflictResolution.GrantWins
			? {
					action:
						vertices[0].operation.type === "grant"
							? ActionType.DropRight
							: ActionType.DropLeft,
				}
			: {
					action:
						vertices[0].operation.type === "grant"
							? ActionType.DropLeft
							: ActionType.DropRight,
				};
	}
}
