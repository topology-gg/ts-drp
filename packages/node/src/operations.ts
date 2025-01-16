import { NetworkPb } from "@ts-drp/network";
import type { IDRPObject } from "@ts-drp/object";
import { drpMessagesHandler, drpObjectChangesHandler } from "./handlers.js";
import { type DRPNode, log } from "./index.js";

/* Object operations */
enum _OPERATIONS {
	/* Create a new DRP */
	CREATE = 0,
	/* Update operation on a DRP */
	UPDATE = 1,

	/* Subscribe to a PubSub group (either DRP or custom) */
	SUBSCRIBE = 2,
	/* Unsubscribe from a PubSub group */
	UNSUBSCRIBE = 3,
	/* Actively send the DRP to a random peer */
	SYNC = 4,
}

export function createObject(node: DRPNode, object: IDRPObject) {
	node.objectStore.put(object.id, object);
	object.subscribe((obj, originFn, vertices) =>
		drpObjectChangesHandler(node, obj, originFn, vertices),
	);
}

/* data: { id: string } */
export async function subscribeObject(node: DRPNode, objectId: string) {
	node.networkNode.subscribe(objectId);
	node.networkNode.addGroupMessageHandler(objectId, async (e) =>
		drpMessagesHandler(node, undefined, e.detail.msg.data),
	);
}

export function unsubscribeObject(
	node: DRPNode,
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
	node: DRPNode,
	objectId: string,
	peerId?: string,
) {
	const object: IDRPObject | undefined = node.objectStore.get(objectId);
	if (!object) {
		log.error("::syncObject: Object not found");
		return;
	}
	const data = NetworkPb.Sync.create({
		objectId,
		vertexHashes: object.vertices.map((v) => v.hash),
	});
	const message = NetworkPb.Message.create({
		sender: node.networkNode.peerId,
		type: NetworkPb.MessageType.MESSAGE_TYPE_SYNC,
		data: NetworkPb.Sync.encode(data).finish(),
	});

	if (!peerId) {
		await node.networkNode.sendGroupMessageRandomPeer(objectId, message);
	} else {
		await node.networkNode.sendMessage(peerId, message);
	}
}
