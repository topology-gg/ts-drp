import type { Stream } from "@libp2p/interface";
import { streamToUint8Array } from "@ts-drp/network";
import { type DRP, type DRPObject, HashGraph } from "@ts-drp/object";
import { type Vertex } from "@ts-drp/types";
import {
	AggregatedAttestation,
	Attestation,
	AttestationUpdate,
	DRPState,
	FetchState,
	FetchStateResponse,
	Message,
	MessageType,
	Sync,
	SyncAccept,
	Update,
} from "@ts-drp/types";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";

import { type DRPNode } from "./index.js";
import { logger } from "./logger.js";
import { deserializeStateMessage, serializeStateMessage } from "./utils.js";
/*
  Handler for all DRP messages, including pubsub messages and direct messages
  You need to setup stream xor data
*/
export async function drpMessagesHandler(node: DRPNode, stream?: Stream, data?: Uint8Array) {
	let message: Message;
	try {
		if (stream) {
			const byteArray = await streamToUint8Array(stream);
			message = Message.decode(byteArray);
		} else if (data) {
			message = Message.decode(data);
		} else {
			logger.log?.error("::messageHandler: Stream and data are undefined");
			return;
		}
	} catch (err) {
		logger.log?.error("::messageHandler: Error decoding message", err);
		return;
	}

	switch (message.type) {
		case MessageType.MESSAGE_TYPE_FETCH_STATE:
			fetchStateHandler(node, message.sender, message.data);
			break;
		case MessageType.MESSAGE_TYPE_FETCH_STATE_RESPONSE:
			fetchStateResponseHandler(node, message.data);
			break;
		case MessageType.MESSAGE_TYPE_UPDATE:
			await updateHandler(node, message.sender, message.data);
			break;
		case MessageType.MESSAGE_TYPE_SYNC:
			if (!stream) {
				logger.log?.error("::messageHandler: Stream is undefined");
				return;
			}
			await syncHandler(node, message.sender, message.data);
			break;
		case MessageType.MESSAGE_TYPE_SYNC_ACCEPT:
			if (!stream) {
				logger.log?.error("::messageHandler: Stream is undefined");
				return;
			}
			await syncAcceptHandler(node, message.sender, message.data);
			break;
		case MessageType.MESSAGE_TYPE_SYNC_REJECT:
			syncRejectHandler(node, message.data);
			break;
		case MessageType.MESSAGE_TYPE_ATTESTATION_UPDATE:
			await attestationUpdateHandler(node, message.sender, message.data);
			break;
		default:
			logger.log?.error("::messageHandler: Invalid operation");
			break;
	}
}

function fetchStateHandler(node: DRPNode, sender: string, data: Uint8Array) {
	const fetchState = FetchState.decode(data);
	const drpObject = node.objectStore.get(fetchState.objectId);
	if (!drpObject) {
		logger.log?.error("::fetchStateHandler: Object not found");
		return;
	}

	const aclState = drpObject.aclStates.get(fetchState.vertexHash);
	const drpState = drpObject.drpStates.get(fetchState.vertexHash);
	const response = FetchStateResponse.create({
		objectId: fetchState.objectId,
		vertexHash: fetchState.vertexHash,
		aclState: serializeStateMessage(aclState),
		drpState: serializeStateMessage(drpState),
	});

	const message = Message.create({
		sender: node.networkNode.peerId,
		type: MessageType.MESSAGE_TYPE_FETCH_STATE_RESPONSE,
		data: FetchStateResponse.encode(response).finish(),
	});
	node.networkNode.sendMessage(sender, message).catch((e) => {
		logger.log?.error("::fetchStateHandler: Error sending message", e);
	});
}

function fetchStateResponseHandler(node: DRPNode, data: Uint8Array) {
	const fetchStateResponse = FetchStateResponse.decode(data);
	if (!fetchStateResponse.drpState && !fetchStateResponse.aclState) {
		logger.log?.error("::fetchStateResponseHandler: No state found");
	}
	const object = node.objectStore.get(fetchStateResponse.objectId);
	if (!object) {
		logger.log?.error("::fetchStateResponseHandler: Object not found");
		return;
	}
	if (!object.acl) {
		logger.log?.error("::fetchStateResponseHandler: ACL not found");
		return;
	}

	const aclState = deserializeStateMessage(fetchStateResponse.aclState);
	const drpState = deserializeStateMessage(fetchStateResponse.drpState);
	if (fetchStateResponse.vertexHash === HashGraph.rootHash) {
		const state = aclState;
		object.aclStates.set(fetchStateResponse.vertexHash, state);
		for (const e of state.state) {
			if (object.originalObjectACL) object.originalObjectACL[e.key] = e.value;
			object.acl[e.key] = e.value;
		}
		node.objectStore.put(object.id, object);
		return;
	}

	if (fetchStateResponse.aclState) {
		object.aclStates.set(fetchStateResponse.vertexHash, aclState as DRPState);
	}
	if (fetchStateResponse.drpState) {
		object.drpStates.set(fetchStateResponse.vertexHash, drpState as DRPState);
	}
}

async function attestationUpdateHandler(node: DRPNode, sender: string, data: Uint8Array) {
	const attestationUpdate = AttestationUpdate.decode(data);
	const object = node.objectStore.get(attestationUpdate.objectId);
	if (!object) {
		logger.log?.error("::attestationUpdateHandler: Object not found");
		return;
	}

	if (object.acl.query_isFinalitySigner(sender)) {
		object.finalityStore.addSignatures(sender, attestationUpdate.attestations);
	}
}

/*
  data: { id: string, operations: {nonce: string, fn: string, args: string[] }[] }
  operations array doesn't contain the full remote operations array
*/
async function updateHandler(node: DRPNode, sender: string, data: Uint8Array) {
	const updateMessage = Update.decode(data);
	const object = node.objectStore.get(updateMessage.objectId);
	if (!object) {
		logger.log?.error("::updateHandler: Object not found");
		return false;
	}

	let verifiedVertices: Vertex[] = [];
	if (object.acl.permissionless) {
		verifiedVertices = updateMessage.vertices;
	} else {
		verifiedVertices = await verifyACLIncomingVertices(object, updateMessage.vertices);
	}

	const [merged, _] = object.merge(verifiedVertices);

	if (!merged) {
		await node.syncObject(updateMessage.objectId, sender);
	} else {
		// add their signatures
		object.finalityStore.addSignatures(sender, updateMessage.attestations);

		// add my signatures
		const attestations = signFinalityVertices(node, object, verifiedVertices);

		if (attestations.length !== 0) {
			// broadcast the attestations
			const message = Message.create({
				sender: node.networkNode.peerId,
				type: MessageType.MESSAGE_TYPE_ATTESTATION_UPDATE,
				data: AttestationUpdate.encode(
					AttestationUpdate.create({
						objectId: object.id,
						attestations: attestations,
					})
				).finish(),
			});

			node.networkNode.broadcastMessage(object.id, message).catch((e) => {
				logger.log?.error("::updateHandler: Error broadcasting message", e);
			});
		}
	}

	node.objectStore.put(object.id, object);

	return true;
}

/*
  data: { id: string, operations: {nonce: string, fn: string, args: string[] }[] }
  operations array contain the full remote operations array
*/
async function syncHandler(node: DRPNode, sender: string, data: Uint8Array) {
	// (might send reject) <- TODO: when should we reject?
	const syncMessage = Sync.decode(data);
	const object = node.objectStore.get(syncMessage.objectId);
	if (!object) {
		logger.log?.error("::syncHandler: Object not found");
		return;
	}

	await signGeneratedVertices(node, object.vertices);

	const requested: Set<Vertex> = new Set(object.vertices);
	const requesting: string[] = [];
	for (const h of syncMessage.vertexHashes) {
		const vertex = object.vertices.find((v: Vertex) => v.hash === h);
		if (vertex) {
			requested.delete(vertex);
		} else {
			requesting.push(h);
		}
	}

	if (requested.size === 0 && requesting.length === 0) return;

	const attestations = getAttestations(object, [...requested]);

	const message = Message.create({
		sender: node.networkNode.peerId,
		type: MessageType.MESSAGE_TYPE_SYNC_ACCEPT,
		// add data here
		data: SyncAccept.encode(
			SyncAccept.create({
				objectId: object.id,
				requested: [...requested],
				attestations,
				requesting,
			})
		).finish(),
	});

	node.networkNode.sendMessage(sender, message).catch((e) => {
		logger.log?.error("::syncHandler: Error sending message", e);
	});
}

/*
  data: { id: string, operations: {nonce: string, fn: string, args: string[] }[] }
  operations array contain the full remote operations array
*/
async function syncAcceptHandler(node: DRPNode, sender: string, data: Uint8Array) {
	const syncAcceptMessage = SyncAccept.decode(data);
	const object = node.objectStore.get(syncAcceptMessage.objectId);
	if (!object) {
		logger.log?.error("::syncAcceptHandler: Object not found");
		return;
	}

	let verifiedVertices: Vertex[] = [];
	if (object.acl.permissionless) {
		verifiedVertices = syncAcceptMessage.requested;
	} else {
		verifiedVertices = await verifyACLIncomingVertices(object, syncAcceptMessage.requested);
	}

	if (verifiedVertices.length !== 0) {
		object.merge(verifiedVertices);
		object.finalityStore.mergeSignatures(syncAcceptMessage.attestations);
		node.objectStore.put(object.id, object);
	}

	await signGeneratedVertices(node, object.vertices);
	signFinalityVertices(node, object, object.vertices);

	// send missing vertices
	const requested: Vertex[] = [];
	for (const h of syncAcceptMessage.requesting) {
		const vertex = object.vertices.find((v: Vertex) => v.hash === h);
		if (vertex) {
			requested.push(vertex);
		}
	}

	if (requested.length === 0) return;

	const attestations = getAttestations(object, requested);

	const message = Message.create({
		sender: node.networkNode.peerId,
		type: MessageType.MESSAGE_TYPE_SYNC_ACCEPT,
		data: SyncAccept.encode(
			SyncAccept.create({
				objectId: object.id,
				requested,
				attestations,
				requesting: [],
			})
		).finish(),
	});
	node.networkNode.sendMessage(sender, message).catch((e) => {
		logger.log?.error("::syncAcceptHandler: Error sending message", e);
	});
}

/* data: { id: string } */
function syncRejectHandler(_node: DRPNode, _data: Uint8Array) {
	// TODO: handle reject. Possible actions:
	// - Retry sync
	// - Ask sync from another peer
	// - Do nothing
}

export function drpObjectChangesHandler<T extends DRP>(
	node: DRPNode,
	obj: DRPObject<T>,
	originFn: string,
	vertices: Vertex[]
) {
	switch (originFn) {
		case "merge":
			node.objectStore.put(obj.id, obj);
			break;
		case "callFn": {
			const attestations = signFinalityVertices(node, obj, vertices);
			node.objectStore.put(obj.id, obj);

			signGeneratedVertices(node, vertices)
				.then(() => {
					// send vertices to the pubsub group
					const message = Message.create({
						sender: node.networkNode.peerId,
						type: MessageType.MESSAGE_TYPE_UPDATE,
						data: Update.encode(
							Update.create({
								objectId: obj.id,
								vertices: vertices,
								attestations: attestations,
							})
						).finish(),
					});
					node.networkNode.broadcastMessage(obj.id, message).catch((e) => {
						logger.log?.error("::drpObjectChangesHandler: Error broadcasting message", e);
					});
				})
				.catch((e) => {
					logger.log?.error("::drpObjectChangesHandler: Error signing vertices", e);
				});
			break;
		}
		default:
			logger.log?.error("::createObject: Invalid origin function");
	}
}

export async function signGeneratedVertices(node: DRPNode, vertices: Vertex[]) {
	const signPromises = vertices.map(async (vertex) => {
		if (vertex.peerId !== node.networkNode.peerId || vertex.signature.length !== 0) {
			return;
		}
		try {
			vertex.signature = await node.keychain.signWithEd25519(vertex.hash);
		} catch (error) {
			logger.log?.error("::signGeneratedVertices: Error signing vertex:", vertex.hash, error);
		}
	});

	await Promise.all(signPromises);
}

// Signs the vertices. Returns the attestations
export function signFinalityVertices<T extends DRP>(
	node: DRPNode,
	obj: DRPObject<T>,
	vertices: Vertex[]
) {
	if (!obj.acl.query_isFinalitySigner(node.networkNode.peerId)) {
		return [];
	}
	const attestations = generateAttestations(node, obj, vertices);
	obj.finalityStore.addSignatures(node.networkNode.peerId, attestations, false);
	return attestations;
}

function generateAttestations<T extends DRP>(
	node: DRPNode,
	object: DRPObject<T>,
	vertices: Vertex[]
): Attestation[] {
	// Two condition:
	// - The node can sign the vertex
	// - The node hasn't signed for the vertex
	const goodVertices = vertices.filter(
		(v) =>
			object.finalityStore.canSign(node.networkNode.peerId, v.hash) &&
			!object.finalityStore.signed(node.networkNode.peerId, v.hash)
	);
	return goodVertices.map((v) => ({
		data: v.hash,
		signature: node.keychain.signWithBls(v.hash),
	}));
}

function getAttestations<T extends DRP>(
	object: DRPObject<T>,
	vertices: Vertex[]
): AggregatedAttestation[] {
	return vertices
		.map((v) => object.finalityStore.getAttestation(v.hash))
		.filter((a) => a !== undefined);
}

export async function verifyACLIncomingVertices<T extends DRP>(
	object: DRPObject<T>,
	incomingVertices: Vertex[]
): Promise<Vertex[]> {
	const vertices: Vertex[] = incomingVertices.map((vertex) => {
		return {
			hash: vertex.hash,
			peerId: vertex.peerId,
			operation: {
				drpType: vertex.operation?.drpType ?? "",
				opType: vertex.operation?.opType ?? "",
				value: vertex.operation?.value,
			},
			dependencies: vertex.dependencies,
			timestamp: vertex.timestamp,
			signature: vertex.signature,
		};
	});

	if (!object.acl) {
		return vertices;
	}
	const verificationPromises = vertices.map(async (vertex) => {
		if (vertex.signature.length === 0) {
			return null;
		}

		const publicKey = object.acl.query_getPeerKey(vertex.peerId);
		if (!publicKey) {
			return null;
		}

		const publicKeyBytes = uint8ArrayFromString(publicKey.ed25519PublicKey, "base64");
		const data = uint8ArrayFromString(vertex.hash);

		try {
			const cryptoKey = await crypto.subtle.importKey(
				"raw",
				publicKeyBytes,
				{ name: "Ed25519" },
				true,
				["verify"]
			);

			const isValid = await crypto.subtle.verify(
				{ name: "Ed25519" },
				cryptoKey,
				vertex.signature,
				data
			);

			return isValid ? vertex : null;
		} catch (error) {
			logger.log?.error("Error verifying signature:", error);
			return null;
		}
	});

	const verifiedVertices: Vertex[] = (await Promise.all(verificationPromises)).filter(
		(vertex: Vertex | null): vertex is Vertex => vertex !== null
	);

	return verifiedVertices;
}
