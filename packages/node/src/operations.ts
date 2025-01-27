import { NetworkPb } from "@ts-drp/network";
import { type DRP, DRPObject, HashGraph } from "@ts-drp/object";

import { drpMessagesHandler, drpObjectChangesHandler } from "./handlers.js";
import { type DRPNode, log } from "./index.js";

export function createObject(node: DRPNode, object: DRPObject) {
	node.objectStore.put(object.id, object);
	object.subscribe((obj, originFn, vertices) =>
		drpObjectChangesHandler(node, obj, originFn, vertices)
	);
}

export async function connectObject(
	node: DRPNode,
	id: string,
	drp?: DRP,
	peerId?: string
): Promise<DRPObject> {
	const object = DRPObject.createObject({
		peerId: node.networkNode.peerId,
		id,
		drp,
	});
	node.objectStore.put(id, object);

	await sendRequestTopicDiscovery(node, id);
	await fetchState(node, id, peerId);
	// sync process needs to finish before subscribing
	const retry = setInterval(async () => {
		if (object.acl) {
			await syncObject(node, id, peerId);
			await subscribeObject(node, id);
			object.subscribe((obj, originFn, vertices) =>
				drpObjectChangesHandler(node, obj, originFn, vertices)
			);
			clearInterval(retry);
		}
	}, 1000);
	return object;
}

async function sendRequestTopicDiscovery(node: DRPNode, topic: string) {
	console.log("sendRequestTopicDiscovery", topic);
	const data = NetworkPb.TopicDiscoveryRequest.create({
		topic,
	});
	const message = NetworkPb.Message.create({
		sender: node.networkNode.peerId.toString(),
		type: NetworkPb.MessageType.MESSAGE_TYPE_TOPIC_DISCOVERY_REQUEST,
		data: NetworkPb.TopicDiscoveryRequest.encode(data).finish(),
	});
	await node.networkNode.broadcastMessage("drp::topic::discovery", message);
}

/* data: { id: string } */
export async function subscribeObject(node: DRPNode, objectId: string) {
	node.networkNode.subscribe(objectId);
	await sendRequestTopicDiscovery(node, objectId);
	node.networkNode.addGroupMessageHandler(
		objectId,
		async (e) => await drpMessagesHandler(node, undefined, e.detail.msg.data)
	);
}

export function unsubscribeObject(node: DRPNode, objectId: string, purge?: boolean) {
	node.networkNode.unsubscribe(objectId);
	if (purge) node.objectStore.remove(objectId);
}

export async function fetchState(node: DRPNode, objectId: string, peerId?: string) {
	const data = NetworkPb.FetchState.create({
		objectId,
		vertexHash: HashGraph.rootHash,
	});
	const message = NetworkPb.Message.create({
		sender: node.networkNode.peerId,
		type: NetworkPb.MessageType.MESSAGE_TYPE_FETCH_STATE,
		data: NetworkPb.FetchState.encode(data).finish(),
	});

	if (!peerId) {
		await node.networkNode.sendGroupMessageRandomPeer(objectId, message);
	} else {
		await node.networkNode.sendMessage(peerId, message);
	}
}

/*
  data: { vertex_hashes: string[] }
*/
export async function syncObject(node: DRPNode, objectId: string, peerId?: string) {
	const object: DRPObject | undefined = node.objectStore.get(objectId);
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
