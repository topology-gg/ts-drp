import { ACL } from "./acl.js";
import { DRP } from "./drp.js";
import { FinalityStore } from "./finality.js";
import { DRPObjectBase, Vertex } from "../proto/drp/v1/object_pb.js";

export interface DRPObject<T extends DRP> extends DRPObjectBase {
	/**
	 * The id of the DRP object.
	 */
	readonly id: string;
	/**
	 * The ACL of the DRP object.
	 */
	acl: ACL;
	/**
	 * The DRP of the DRP object.
	 */
	drp: T;

	/**
	 * The original DRP of the DRP object.
	 */
	originalDRP?: T;
	/**
	 * The original ACL of the DRP object.
	 */
	originalObjectACL?: ACL;
	/**
	 * The finality store of the DRP object.
	 */
	finalityStore: FinalityStore;
	/**
	 * The subscriptions of the DRP object.
	 */
	subscriptions: DRPObjectCallback<T>[];
}

export type DRPObjectCallback<T extends DRP> = (
	object: DRPObject<T>,
	origin: string,
	vertices: Vertex[]
) => void;
