import { ActionType, type ResolveConflictsType, SemanticsType, type Vertex } from "../index.js";
import type { DRPPublicCredential } from "../interface.js";
import type { PeerAccess } from "./interface.js";
import { type ACL, ACLConflictResolution, ACLGroup } from "./interface.js";

export class ObjectACL implements ACL {
	semanticsType = SemanticsType.pair;

	// if true, any peer can write to the object
	permissionless: boolean;
	private _conflictResolution: ACLConflictResolution;
	private _privilegedUsers: Map<string, PeerAccess>;
	// peers who can sign finality

	constructor(options: {
		admins: Map<string, DRPPublicCredential>;
		permissionless?: boolean;
		conflictResolution?: ACLConflictResolution;
	}) {
		this.permissionless = options.permissionless ?? false;
		this._privilegedUsers = new Map();

		const permissions = new Set<ACLGroup>([ACLGroup.Admin, ACLGroup.Finality]);
		if (!options.permissionless) {
			permissions.add(ACLGroup.Writer);
		}

		for (const [key, value] of options.admins) {
			this._privilegedUsers.set(key, {
				publicKey: value,
				permissions: permissions,
			});
		}
		this._conflictResolution = options.conflictResolution ?? ACLConflictResolution.RevokeWins;
	}

	grant(senderId: string, peerId: string, publicKey: DRPPublicCredential, group: ACLGroup): void {
		if (!this.query_isAdmin(senderId)) {
			throw new Error("Only admin peers can grant permissions.");
		}
		const existingUser = this._privilegedUsers.get(peerId);
		const _grant = (peerId: string, group: ACLGroup) => {
			const user = existingUser ?? { publicKey, permissions: new Set() };
			user.permissions.add(group);
			this._privilegedUsers.set(peerId, user);
		};
		switch (group) {
			case ACLGroup.Admin:
				_grant(peerId, ACLGroup.Admin);
				break;
			case ACLGroup.Finality:
				_grant(peerId, ACLGroup.Finality);
				break;
			case ACLGroup.Writer:
				if (this.permissionless) {
					throw new Error("Cannot grant write permissions to a peer in permissionless mode.");
				}
				_grant(peerId, ACLGroup.Writer);
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
				this._privilegedUsers.get(peerId)?.permissions.delete(ACLGroup.Finality);
				break;
			case ACLGroup.Writer:
				this._privilegedUsers.get(peerId)?.permissions.delete(ACLGroup.Writer);
				break;
			default:
				throw new Error("Invalid group.");
		}
	}

	query_getFinalitySigners(): Map<string, DRPPublicCredential> {
		return new Map(
			[...this._privilegedUsers.entries()]
				.filter(([, user]) => user.permissions.has(ACLGroup.Finality))
				.map(([peerId, user]) => [peerId, user.publicKey])
		);
	}

	query_isAdmin(peerId: string): boolean {
		return this._privilegedUsers.get(peerId)?.permissions.has(ACLGroup.Admin) ?? false;
	}

	query_isFinalitySigner(peerId: string): boolean {
		return this._privilegedUsers.get(peerId)?.permissions.has(ACLGroup.Finality) ?? false;
	}

	query_isWriter(peerId: string): boolean {
		return this._privilegedUsers.get(peerId)?.permissions.has(ACLGroup.Writer) ?? false;
	}

	query_getPeerKey(peerId: string): DRPPublicCredential | undefined {
		return this._privilegedUsers.get(peerId)?.publicKey;
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
