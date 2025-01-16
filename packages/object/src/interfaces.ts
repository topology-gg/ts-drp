import { FinalityStore } from "./finality/index.js";
import type {
	HashGraph,
	Operation,
	ResolveConflictsType,
	SemanticsType,
	Vertex,
} from "./hashgraph/index.js";
import type * as ObjectPb from "./proto/drp/object/v1/object_pb.js";

export type DRPObjectCallback = (
	object: IDRPObject,
	origin: string,
	vertices: ObjectPb.Vertex[],
) => void;

export interface DRPPublicCredential {
	ed25519PublicKey: string;
	blsPublicKey: string;
}

export interface IACL {
	grant: (
		senderId: string,
		peerId: string,
		publicKey: DRPPublicCredential,
	) => void;
	revoke: (senderId: string, peerId: string) => void;
	query_getWriters: () => Map<string, DRPPublicCredential>;
	query_isWriter: (peerId: string) => boolean;
	query_isAdmin: (peerId: string) => boolean;
	query_getPeerKey: (peerId: string) => DRPPublicCredential | undefined;
}

export interface DRP {
	semanticsType: SemanticsType;
	resolveConflicts: (vertices: Vertex[]) => ResolveConflictsType;
	// biome-ignore lint: attributes can be anything
	[key: string]: any;
}

export interface IDRPObject extends ObjectPb.DRPObjectBase {
	acl?: ProxyHandler<IACL & DRP>;
	drp?: ProxyHandler<DRP>;
	hashGraph?: HashGraph;
	finalityStore: FinalityStore;
	subscriptions: DRPObjectCallback[];
	merge(vertices: Vertex[]): [merged: boolean, missing: string[]];
	subscribe(callback: DRPObjectCallback): void;
}

export interface LcaAndOperations {
	lca: string;
	linearizedOperations: Operation[];
}
