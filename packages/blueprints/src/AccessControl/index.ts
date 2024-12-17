import {
	type ACL,
	ActionType,
	type ResolveConflictsType,
	SemanticsType,
	type Vertex,
} from "@ts-drp/object";

export enum AccessControlConflictResolution {
	GrantWins = 0,
	RevokeWins = 1,
}

export class AccessControl implements ACL  {
	operations: string[] = ["grant", "revoke"];
	semanticsType = SemanticsType.pair;
	peerKeyStore = new Map<string, string>();

	private _conflictResolution: AccessControlConflictResolution;
	private _admins: Set<string>;
	private _writers: Set<string>;

	constructor(
		admins: Map<string, string>,
		conflictResolution?: AccessControlConflictResolution,
	) {
		this._admins = new Set(admins.keys());
		this._writers = new Set(admins.keys());
		this.peerKeyStore = admins;
		this._conflictResolution =
			conflictResolution ?? AccessControlConflictResolution.RevokeWins;
	}

	private _grant(peerId: string, publicKey: string): void {
		this._writers.add(peerId);
		this.peerKeyStore.set(peerId, publicKey);
	}

	grant(peerId: string, publicKey: string): void {
		this._grant(peerId, publicKey);
	}

	private _revoke(peerId: string): void {
		this._writers.delete(peerId);
	}

	revoke(peerId: string): void {
		this._revoke(peerId);
	}

	isAdmin(peerId: string): boolean {
		return this._admins.has(peerId);
	}

	isWriter(peerId: string): boolean {
		return this._writers.has(peerId);
	}

	getPeerKey(peerId: string): string | undefined {
		return this.peerKeyStore.get(peerId);
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
