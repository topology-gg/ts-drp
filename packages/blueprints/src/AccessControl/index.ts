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

	private _grant(publicKey: string): void {
		this._writers.add(publicKey);
	}

	grant(publicKey: string): void {
		this._grant(publicKey);
	}

	private _revoke(publicKey: string): void {
		this._writers.delete(publicKey);
	}

	revoke(publicKey: string): void {
		this._revoke(publicKey);
	}

	isAdmin(publicKey: string): boolean {
		return this._admins.has(publicKey);
	}

	isWriter(publicKey: string): boolean {
		return this._writers.has(publicKey);
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
