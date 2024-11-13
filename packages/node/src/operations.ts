import { Role } from "@topology-foundation/blueprints/src/constants.js";
import { NetworkPb } from "@topology-foundation/network";
import { ObjectPb } from "@topology-foundation/object";
import type { CRO, TopologyObject } from "@topology-foundation/object";
import {
	topologyMessagesHandler,
	topologyObjectChangesHandler,
} from "./handlers.js";
import type { TopologyNode } from "./index.js";

/* Object operations */
enum OPERATIONS {
	/* Create a new CRO */
	CREATE = 0,
	/* Update operation on a CRO */
	UPDATE = 1,

	/* Subscribe to a PubSub group (either CRO or custom) */
	SUBSCRIBE = 2,
	/* Unsubscribe from a PubSub group */
	UNSUBSCRIBE = 3,
	/* Actively send the CRO RIBLT to a random peer */
	SYNC = 4,
	/* Grant permission guest to another node */
	GRANT = 5,
	/* Revoke permission guest from another node */
	REVOKE = 6,
}

export function createObject(node: TopologyNode, object: TopologyObject) {
	node.objectStore.put(object.id, object);
	object.subscribe((obj, originFn, vertices) =>
		topologyObjectChangesHandler(node, obj, originFn, vertices),
	);
}

/* data: { id: string } */
export async function subscribeObject(node: TopologyNode, objectId: string) {
	node.networkNode.subscribe(objectId);
	node.networkNode.addGroupMessageHandler(objectId, async (e) =>
		topologyMessagesHandler(node, undefined, e.detail.msg.data),
	);
}

export function unsubscribeObject(
	node: TopologyNode,
	objectId: string,
	purge?: boolean,
) {
	node.networkNode.unsubscribe(objectId);
	if (purge) node.objectStore.remove(objectId);
}

/*
  data: { vertex_hashes: string[] }
*/
export async function syncObject(
	node: TopologyNode,
	objectId: string,
	peerId?: string,
) {
	const object: TopologyObject | undefined = node.objectStore.get(objectId);
	if (!object) {
		console.error("topology::node::syncObject", "Object not found");
		return;
	}
	const data = NetworkPb.Sync.create({
		objectId,
		vertexHashes: object.vertices.map((v) => v.hash),
	});
	const message = NetworkPb.Message.create({
		sender: node.networkNode.peerId,
		type: NetworkPb.Message_MessageType.SYNC,
		data: NetworkPb.Sync.encode(data).finish(),
	});

	if (!peerId) {
		await node.networkNode.sendGroupMessageRandomPeer(
			objectId,
			["/topology/message/0.0.1"],
			message,
		);
	} else {
		await node.networkNode.sendMessage(
			peerId,
			["/topology/message/0.0.1"],
			message,
		);
	}
}

export async function grantPermission(
	node: TopologyNode,
	objectId: string,
	peerId: string,
) {
	const object: TopologyObject | undefined = node.objectStore.get(objectId);
	if (!object) {
		console.error("topology::node::grantPermission", "Object not found");
		return;
	}

	const cro: CRO | undefined = object.cro as CRO;
	if (!cro) {
		console.error("topology::node::grantPermission", "CRO not found");
		return;
	}
	if (!cro.hasRole(node.networkNode.peerId, Role.ADMIN)) {
		console.error("topology::node::grantPermission", "Not an admin");
		return;
	}
	if (cro.hasRole(peerId, Role.ADMIN)) {
		console.error("topology::node::grantPermission", "Can't grant admin role");
		return;
	}

	cro.grantRole(peerId);
}

export async function revokePermission(
	node: TopologyNode,
	objectId: string,
	peerId: string,
) {
	const object: TopologyObject | undefined = node.objectStore.get(objectId);
	if (!object) {
		console.error("topology::node::revokePermission", "Object not found");
		return;
	}

	const cro: CRO | undefined = object.cro as CRO;
	if (!cro) {
		console.error("topology::node::revokePermission", "CRO not found");
		return;
	}
	if (!cro.hasRole(node.networkNode.peerId, Role.ADMIN)) {
		console.error("topology::node::revokePermission", "Not an admin");
		return;
	}
	if (cro.hasRole(peerId, Role.ADMIN)) {
		console.error(
			"topology::node::revokePermission",
			"Can't revoke admin role",
		);
		return;
	}

	cro.revokeRole(peerId);
}
