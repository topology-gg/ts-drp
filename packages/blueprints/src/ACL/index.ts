import {
	ActionType,
	type DRP,
	type DRPPublicCredential,
	type IACL,
	type ResolveConflictsType,
	SemanticsType,
	type Vertex,
} from "@ts-drp/object";

export enum ACLConflictResolution {
	GrantWins = 0,
	RevokeWins = 1,
}

export class ACL implements IACL, DRP {
	operations: string[] = ["grant", "revoke"];
	semanticsType = SemanticsType.pair;

	private _conflictResolution: ACLConflictResolution;
	private _admins: Map<string, DRPPublicCredential>;
	private _writers: Map<string, DRPPublicCredential>;

	constructor(
		admins: Map<string, DRPPublicCredential>,
		conflictResolution?: ACLConflictResolution,
	) {
		this._admins = new Map(Array.from(admins, ([key, value]) => [key, value]));
		this._writers = new Map(Array.from(admins, ([key, value]) => [key, value]));
		this._conflictResolution =
			conflictResolution ?? ACLConflictResolution.RevokeWins;
	}

	private _grant(peerId: string, publicKey: DRPPublicCredential): void {
		this._writers.set(peerId, publicKey);
	}

	grant(
		senderId: string,
		peerId: string,
		publicKey: DRPPublicCredential,
	): void {
		if (!this.isAdmin(senderId)) {
			throw new Error("Only admin nodes can grant permissions.");
		}
		this._grant(peerId, publicKey);
	}

	private _revoke(peerId: string): void {
		this._writers.delete(peerId);
	}

	revoke(senderId: string, peerId: string): void {
		if (!this.isAdmin(senderId)) {
			throw new Error("Only admin nodes can revoke permissions.");
		}
		if (this.isAdmin(peerId)) {
			throw new Error(
				"Cannot revoke permissions from a node with admin privileges.",
			);
		}
		this._revoke(peerId);
	}

	getWriters(): Map<string, DRPPublicCredential> {
		return new Map(this._writers);
	}

	isAdmin(peerId: string): boolean {
		return this._admins.has(peerId);
	}

	isWriter(peerId: string): boolean {
		return this._writers.has(peerId);
	}

	getPeerKey(peerId: string): DRPPublicCredential | undefined {
		return this._writers.get(peerId);
	}

	resolveConflicts(vertices: Vertex[]): ResolveConflictsType {
		if (!vertices[0].operation || !vertices[1].operation)
			return { action: ActionType.Nop };
		if (
			vertices[0].operation.type === vertices[1].operation.type ||
			vertices[0].operation.value !== vertices[1].operation.value
		)
			return { action: ActionType.Nop };

		return this._conflictResolution === ACLConflictResolution.GrantWins
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
