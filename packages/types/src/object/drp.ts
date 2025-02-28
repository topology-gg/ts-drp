import { ResolveConflictsType, SemanticsType } from "./hashgraph.js";
import { Vertex } from "../proto/drp/v1/object_pb.js";

/**
 * The type of the DRP.
 */
export enum DrpType {
	ACL = "ACL",
	DRP = "DRP",
}

export interface DRP {
	/**
	 * The semantics type of the DRP.
	 */
	semanticsType: SemanticsType;
	/**
	 * The resolve conflicts function of the DRP.
	 *
	 * @param vertices - The vertices to resolve conflicts from.
	 */
	resolveConflicts?(vertices: Vertex[]): ResolveConflictsType;
	/**
	 * The properties of the DRP.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}
