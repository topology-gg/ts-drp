import type { Operation, ResolveConflictsType, SemanticsType, Vertex } from "./hashgraph/index.js";
import type { DRPObject } from "./index.js";
import type * as ObjectPb from "./proto/drp/object/v1/object_pb.js";

export enum DrpType {
	ACL = "ACL",
	DRP = "DRP",
}

export type DRPObjectCallback = (
	object: DRPObject,
	origin: string,
	vertices: ObjectPb.Vertex[]
) => void;

export interface DRPPublicCredential {
	ed25519PublicKey: string;
	blsPublicKey: string;
}

export interface DRP {
	semanticsType: SemanticsType;
	resolveConflicts?: (vertices: Vertex[]) => ResolveConflictsType;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}

export interface LcaAndOperations {
	lca: string;
	linearizedOperations: Operation[];
}
