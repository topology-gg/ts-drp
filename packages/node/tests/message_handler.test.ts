import { Connection, IdentifyResult, Libp2p, Stream } from "@libp2p/interface";
import { multiaddr } from "@multiformats/multiaddr";
import { SetDRP } from "@ts-drp/blueprints";
import {
	DRP_MESSAGE_PROTOCOL,
	DRPNetworkNode,
	DRPNetworkNodeConfig,
	NetworkPb,
	uint8ArrayToStream,
} from "@ts-drp/network";
import { Message } from "@ts-drp/network/src/proto/drp/network/v1/messages_pb.js";
import { DrpType } from "@ts-drp/object";
import { DRPObject, ObjectACL } from "@ts-drp/object";
import { after } from "node:test";
import { raceEvent } from "race-event";
import { beforeAll, describe, expect, test } from "vitest";

import { drpMessagesHandler, signGeneratedVertices } from "../src/handlers.js";
import { DRPNode } from "../src/index.js";

describe("Handle message correctly", () => {
	const controller = new AbortController();
	let node1: DRPNode;
	let node2: DRPNode;
	let bootstrapNode: DRPNetworkNode;
	let drpObject: DRPObject;
	let libp2pNode2: Libp2p;
	const mockSender = "12D3KooWEtLcL6DZVTnDe5rkv7a9pg7FwQQAyJpJX1zWH1tgAAEs";

	const isDialable = async (node: DRPNetworkNode, timeout = false) => {
		let resolver: (value: boolean) => void;
		const promise = new Promise<boolean>((resolve) => {
			resolver = resolve;
		});

		if (timeout) {
			setTimeout(() => {
				resolver(false);
			}, 10);
		}

		const callback = () => {
			resolver(true);
		};

		await node.isDialable(callback);
		return await promise;
	};

	beforeAll(async () => {
		bootstrapNode = new DRPNetworkNode({
			bootstrap: true,
			listen_addresses: ["/ip4/0.0.0.0/tcp/0/ws"],
			bootstrap_peers: [],
			private_key_seed: "bootstrap_message_handler",
		});
		await bootstrapNode.start();
		console.log("Waiting for bootstrap node to be dialable", bootstrapNode.getMultiaddrs());

		const bootstrapMultiaddrs = bootstrapNode.getMultiaddrs();
		const nodeConfig: DRPNetworkNodeConfig = {
			bootstrap_peers: bootstrapMultiaddrs,
			log_config: {
				level: "silent",
			},
		};
		node1 = new DRPNode({
			network_config: nodeConfig,
			credential_config: {
				private_key_seed: "node1",
			},
		});
		node2 = new DRPNode({
			network_config: nodeConfig,
			credential_config: {
				private_key_seed: "node2",
			},
		});

		await node2.start();
		const btLibp2pNode1 = bootstrapNode["_node"] as Libp2p;
		libp2pNode2 = node2.networkNode["_node"] as Libp2p;

		console.log("Waiting for node1 to be dialable");

		await Promise.all([
			raceEvent(btLibp2pNode1, "peer:identify", controller.signal, {
				filter: (event: CustomEvent<IdentifyResult>) =>
					event.detail.peerId.equals(libp2pNode2.peerId) && event.detail.listenAddrs.length > 0,
			}),
			isDialable(node2.networkNode),
		]);

		await node1.start();
		expect(await isDialable(node1.networkNode)).toBe(true);

		const acl = new ObjectACL({
			admins: new Map([
				[node1.networkNode.peerId, node1.credentialStore.getPublicCredential()],
				[node2.networkNode.peerId, node2.credentialStore.getPublicCredential()],
			]),
		});
		drpObject = new DRPObject({
			peerId: node2.networkNode.peerId,
			drp: new SetDRP<number>(),
			acl,
		});
		await node1.createObject({
			drp: new SetDRP<number>(),
			id: drpObject.id,
			acl: acl,
		});

		(drpObject.drp as SetDRP<number>).add(5);
		(drpObject.drp as SetDRP<number>).add(10);

		await raceEvent(libp2pNode2, "connection:open", controller.signal, {
			filter: (event: CustomEvent<Connection>) =>
				event.detail.remotePeer.toString() === node1.networkNode.peerId &&
				event.detail.limits === undefined,
		});
	});

	test("should handle update message correctly", async () => {
		const vertices = drpObject.vertices;
		await signGeneratedVertices(node2, vertices);
		const message = NetworkPb.Message.create({
			sender: mockSender,
			type: NetworkPb.MessageType.MESSAGE_TYPE_UPDATE,
			data: NetworkPb.Update.encode(
				NetworkPb.Update.create({
					objectId: drpObject.id,
					vertices: vertices,
				})
			).finish(),
		});
		await drpMessagesHandler(node1, undefined, NetworkPb.Message.encode(message).finish());

		const expected_vertices = node1
			.getObject(drpObject.id)
			?.hashGraph.getAllVertices()
			.map((vertex) => {
				return vertex.operation;
			});
		expect(expected_vertices).toStrictEqual([
			{ drpType: "", opType: "-1", value: null },
			{ opType: "add", value: [5], drpType: DrpType.DRP },
			{ opType: "add", value: [10], drpType: DrpType.DRP },
		]);
	});

	test("should handle sync message correctly", async () => {
		(drpObject.drp as SetDRP<number>).add(1);
		(drpObject.drp as SetDRP<number>).add(2);
		const message = NetworkPb.Message.create({
			sender: mockSender,
			type: NetworkPb.MessageType.MESSAGE_TYPE_SYNC,
			data: NetworkPb.Sync.encode(
				NetworkPb.Sync.create({
					objectId: drpObject.id,
					vertexHashes: drpObject.vertices.map((vertex) => vertex.hash),
				})
			).finish(),
		});

		const stream = <Stream>(
			await libp2pNode2?.dialProtocol(
				[multiaddr(`/p2p/${node1.networkNode.peerId}`)],
				DRP_MESSAGE_PROTOCOL
			)
		);
		const messageBuffer = Message.encode(message).finish();
		await uint8ArrayToStream(stream, messageBuffer);
		await drpMessagesHandler(node1, stream, undefined);
		await stream.close();
		console.log("here");
		expect(node1.getObject(drpObject.id)?.vertices.length).toBe(3);
		expect(drpObject.vertices.length).toBe(5);
	}, 15000);

	// test("should handle sync accept message correctly", async () => {
	// 	const vertices = drpObject.vertices.slice(3, 5);
	// 	await signGeneratedVertices(node2, vertices);

	// 	const message = NetworkPb.Message.create({
	// 		sender: mockSender,
	// 		type: NetworkPb.MessageType.MESSAGE_TYPE_SYNC_ACCEPT,
	// 		data: NetworkPb.SyncAccept.encode(
	// 			NetworkPb.SyncAccept.create({
	// 				objectId: drpObject.id,
	// 				requested: vertices,
	// 				requesting: [],
	// 				attestations: [],
	// 			})
	// 		).finish(),
	// 	});

	// 	const stream = <Stream>(
	// 		await libp2pNode2?.dialProtocol(
	// 			[multiaddr(`/p2p/${node1.networkNode.peerId}`)],
	// 			DRP_MESSAGE_PROTOCOL
	// 		)
	// 	);
	// 	const messageBuffer = Message.encode(message).finish();
	// 	await uint8ArrayToStream(stream, messageBuffer);

	// 	await drpMessagesHandler(node1, stream, undefined);
	// 	expect(node1.getObject(drpObject.id)?.vertices.length).toBe(5);
	// 	expect(drpObject.vertices.length).toBe(5);
	// }, 10000);

	test("should handle update attestation message correctly", async () => {
		const attestations = node1.getObject(drpObject.id)?.vertices.map((vertex) => {
			return {
				data: vertex.hash,
				signature: node2.credentialStore.signWithBls(vertex.hash),
			};
		});
		const message = NetworkPb.Message.create({
			sender: mockSender,
			type: NetworkPb.MessageType.MESSAGE_TYPE_ATTESTATION_UPDATE,
			data: NetworkPb.AttestationUpdate.encode(
				NetworkPb.AttestationUpdate.create({
					objectId: drpObject.id,
					attestations,
				})
			).finish(),
		});
		await drpMessagesHandler(node1, undefined, NetworkPb.Message.encode(message).finish());
	});

	after(async () => {
		await bootstrapNode.stop();
		await node1.networkNode.stop();
		await node2.networkNode.stop();
	});
});
