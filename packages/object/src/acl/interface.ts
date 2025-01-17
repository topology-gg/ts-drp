import type { DRPPublicCredential } from "../interface.js";
import type { DRP } from "../interface.js";

export interface ACL extends DRP {
	grant: (
		senderId: string,
		peerId: string,
		publicKey: DRPPublicCredential,
		group: ACLGroup,
	) => void;
	revoke: (senderId: string, peerId: string, group: ACLGroup) => void;
	query_getFinalitySigners: () => Map<string, DRPPublicCredential>;
	query_isWriter: (peerId: string) => boolean;
	query_isAdmin: (peerId: string) => boolean;
	query_getPeerKey: (peerId: string) => DRPPublicCredential | undefined;
}

export enum ACLConflictResolution {
	GrantWins = 0,
	RevokeWins = 1,
}

export enum ACLGroup {
	Admin = "ADMIN",
	Finality = "FINALITY",
	Writer = "WRITER",
}
