import type { Stream } from "@libp2p/interface";
import { NetworkPb, streamToUint8Array } from "@ts-drp/network";
import type { DRPObject, ObjectPb, Vertex } from "@ts-drp/object";
import { type DRPNode, log } from "./index.js";

/*
  Handler for all DRP messages, including pubsub messages and direct messages
  You need to setup stream xor data
*/
export async function drpMessagesHandler(
	node: DRPNode,
	stream?: Stream,
	data?: Uint8Array,
) {
	let message: NetworkPb.Message;
	if (stream) {
		const byteArray = await streamToUint8Array(stream);
		message = NetworkPb.Message.decode(byteArray);
	} else if (data) {
		message = NetworkPb.Message.decode(data);
	} else {
		log.error("::messageHandler: Stream and data are undefined");
		return;
	}

	switch (message.type) {
		case NetworkPb.MessageType.MESSAGE_TYPE_UPDATE:
			updateHandler(node, message.data, message.sender);
			break;
		case NetworkPb.MessageType.MESSAGE_TYPE_SYNC:
			if (!stream) {
				log.error("::messageHandler: Stream is undefined");
				return;
			}
			syncHandler(node, message.sender, message.data);
			break;
		case NetworkPb.MessageType.MESSAGE_TYPE_SYNC_ACCEPT:
			if (!stream) {
				log.error("::messageHandler: Stream is undefined");
				return;
			}
			syncAcceptHandler(node, message.sender, message.data);
			break;
		case NetworkPb.MessageType.MESSAGE_TYPE_SYNC_REJECT:
			syncRejectHandler(node, message.data);
			break;
		default:
			log.error("::messageHandler: Invalid operation");
			break;
	}
}

/*
  data: { id: string, operations: {nonce: string, fn: string, args: string[] }[] }
  operations array doesn't contain the full remote operations array
*/
async function updateHandler(node: DRPNode, data: Uint8Array, sender: string) {
	const updateMessage = NetworkPb.Update.decode(data);
	const object = node.objectStore.get(updateMessage.objectId);
	if (!object) {
		log.error("::updateHandler: Object not found");
		return false;
	}

	const [merged, _] = object.merge(
		updateMessage.vertices.map((v) => {
			return {
				hash: v.hash,
				nodeId: v.nodeId,
				operation: {
					type: v.operation?.type ?? "",
					value: v.operation?.value,
				},
				dependencies: v.dependencies,
			};
		}),
	);

	if (!merged) {
		await node.syncObject(updateMessage.objectId, sender);
	}

	node.objectStore.put(object.id, object);

	return true;
}

/*
  data: { id: string, operations: {nonce: string, fn: string, args: string[] }[] }
  operations array contain the full remote operations array
*/
function syncHandler(node: DRPNode, sender: string, data: Uint8Array) {
	// (might send reject) <- TODO: when should we reject?
	const syncMessage = NetworkPb.Sync.decode(data);
	const object = node.objectStore.get(syncMessage.objectId);
	if (!object) {
		log.error("::syncHandler: Object not found");
		return;
	}

	const requested: Set<ObjectPb.Vertex> = new Set(object.vertices);
	const requesting: string[] = [];
	for (const h of syncMessage.vertexHashes) {
		const vertex = object.vertices.find((v) => v.hash === h);
		if (vertex) {
			requested.delete(vertex);
		} else {
			requesting.push(h);
		}
	}

	if (requested.size === 0 && requesting.length === 0) return;

	const message = NetworkPb.Message.create({
		sender: node.networkNode.peerId,
		type: NetworkPb.MessageType.MESSAGE_TYPE_SYNC_ACCEPT,
		// add data here
		data: NetworkPb.SyncAccept.encode(
			NetworkPb.SyncAccept.create({
				objectId: object.id,
				requested: [...requested],
				requesting,
			}),
		).finish(),
	});
	node.networkNode.sendMessage(sender, message);
}

/*
  data: { id: string, operations: {nonce: string, fn: string, args: string[] }[] }
  operations array contain the full remote operations array
*/
function syncAcceptHandler(node: DRPNode, sender: string, data: Uint8Array) {
	const syncAcceptMessage = NetworkPb.SyncAccept.decode(data);
	const object = node.objectStore.get(syncAcceptMessage.objectId);
	if (!object) {
		log.error("::syncAcceptHandler: Object not found");
		return;
	}

	const vertices: Vertex[] = syncAcceptMessage.requested.map((v) => {
		return {
			hash: v.hash,
			nodeId: v.nodeId,
			operation: {
				type: v.operation?.type ?? "",
				value: v.operation?.value,
			},
			dependencies: v.dependencies,
		};
	});

	if (vertices.length !== 0) {
		object.merge(vertices);
		node.objectStore.put(object.id, object);
	}

	// send missing vertices
	const requested: ObjectPb.Vertex[] = [];
	for (const h of syncAcceptMessage.requesting) {
		const vertex = object.vertices.find((v) => v.hash === h);
		if (vertex) {
			requested.push(vertex);
		}
	}

	if (requested.length === 0) return;

	const message = NetworkPb.Message.create({
		sender: node.networkNode.peerId,
		type: NetworkPb.MessageType.MESSAGE_TYPE_SYNC_ACCEPT,
		data: NetworkPb.SyncAccept.encode(
			NetworkPb.SyncAccept.create({
				objectId: object.id,
				requested,
				requesting: [],
			}),
		).finish(),
	});
	node.networkNode.sendMessage(sender, message);
}

/* data: { id: string } */
function syncRejectHandler(node: DRPNode, data: Uint8Array) {
	// TODO: handle reject. Possible actions:
	// - Retry sync
	// - Ask sync from another peer
	// - Do nothing
}

export function drpObjectChangesHandler(
	node: DRPNode,
	obj: DRPObject,
	originFn: string,
	vertices: ObjectPb.Vertex[],
) {
	switch (originFn) {
		case "merge":
			node.objectStore.put(obj.id, obj);
			break;
		case "callFn": {
			node.objectStore.put(obj.id, obj);
			// send vertices to the pubsub group
			const message = NetworkPb.Message.create({
				sender: node.networkNode.peerId,
				type: NetworkPb.MessageType.MESSAGE_TYPE_UPDATE,
				data: NetworkPb.Update.encode(
					NetworkPb.Update.create({
						objectId: obj.id,
						vertices: vertices,
					}),
				).finish(),
			});
			node.networkNode.broadcastMessage(obj.id, message);
			break;
		}
		default:
			log.error("::createObject: Invalid origin function");
	}
}
