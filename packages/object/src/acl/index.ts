import { ActionType, type ResolveConflictsType, SemanticsType, type Vertex } from "../index.js";
import type { DRPPublicCredential } from "../interface.js";
import { type ACL, ACLConflictResolution, ACLGroup } from "./interface.js";

export class ObjectACL implements ACL {
	semanticsType = SemanticsType.pair;

	// if true, any peer can write to the object
	permissionless: boolean;
	private _conflictResolution: ACLConflictResolution;
	private _admins: Map<string, DRPPublicCredential>;
	// peers who can sign finality
	private _finalitySigners: Map<string, DRPPublicCredential>;
	private _writers: Map<string, DRPPublicCredential>;

	constructor(options: {
		admins: Map<string, DRPPublicCredential>;
		permissionless?: boolean;
		conflictResolution?: ACLConflictResolution;
	}) {
		this.permissionless = options.permissionless ?? false;
		this._admins = new Map(Array.from(options.admins, ([key, value]) => [key, value]));
		this._finalitySigners = new Map(Array.from(options.admins, ([key, value]) => [key, value]));
		this._writers = options.permissionless
			? new Map()
			: new Map(Array.from(options.admins, ([key, value]) => [key, value]));
		this._conflictResolution = options.conflictResolution ?? ACLConflictResolution.RevokeWins;
	}

	grant(senderId: string, peerId: string, publicKey: DRPPublicCredential, group: ACLGroup): void {
		if (!this.query_isAdmin(senderId)) {
			throw new Error("Only admin peers can grant permissions.");
		}
		switch (group) {
			case ACLGroup.Admin:
				this._admins.set(peerId, publicKey);
				break;
			case ACLGroup.Finality:
				this._finalitySigners.set(peerId, publicKey);
				break;
			case ACLGroup.Writer:
				if (this.permissionless) {
					throw new Error("Cannot grant write permissions to a peer in permissionless mode.");
				}
				this._writers.set(peerId, publicKey);
				break;
			default:
				throw new Error("Invalid group.");
		}
	}

	revoke(senderId: string, peerId: string, group: ACLGroup): void {
		if (!this.query_isAdmin(senderId)) {
			throw new Error("Only admin peers can revoke permissions.");
		}
		if (this.query_isAdmin(peerId)) {
			throw new Error("Cannot revoke permissions from a peer with admin privileges.");
		}

		switch (group) {
			case ACLGroup.Admin:
				// currently no way to revoke admin privileges
				break;
			case ACLGroup.Finality:
				this._finalitySigners.delete(peerId);
				break;
			case ACLGroup.Writer:
				this._writers.delete(peerId);
				break;
			default:
				throw new Error("Invalid group.");
		}
	}

	query_getFinalitySigners(): Map<string, DRPPublicCredential> {
		return new Map(this._finalitySigners);
	}

	query_isAdmin(peerId: string): boolean {
		return this._admins.has(peerId);
	}

	query_isFinalitySigner(peerId: string): boolean {
		return this._finalitySigners.has(peerId);
	}

	query_isWriter(peerId: string): boolean {
		return this._writers.has(peerId);
	}

	query_getPeerKey(peerId: string): DRPPublicCredential | undefined {
		if (this._admins.has(peerId)) return this._admins.get(peerId);
		if (this._finalitySigners.has(peerId)) return this._finalitySigners.get(peerId);
		return this._writers.get(peerId);
	}

	resolveConflicts(vertices: Vertex[]): ResolveConflictsType {
		if (!vertices[0].operation || !vertices[1].operation) return { action: ActionType.Nop };
		if (
			vertices[0].operation.opType === vertices[1].operation.opType ||
			vertices[0].operation.value[0] !== vertices[1].operation.value[0]
		)
			return { action: ActionType.Nop };

		return this._conflictResolution === ACLConflictResolution.GrantWins
			? {
					action:
						vertices[0].operation.opType === "grant" ? ActionType.DropRight : ActionType.DropLeft,
				}
			: {
					action:
						vertices[0].operation.opType === "grant" ? ActionType.DropLeft : ActionType.DropRight,
				};
	}
}
