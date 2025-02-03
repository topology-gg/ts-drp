import { loadConfig } from "@ts-drp/node/src/config.js";
import { beforeAll, describe, expect, test } from "vitest";

import { NetworkPb } from "../src/index.js";
import { DRPNetworkNode, streamToUint8Array } from "../src/node.js";

describe("DRPNetworkNode can connect & send messages", () => {
	let node1: DRPNetworkNode;
	let node2: DRPNetworkNode;
	let bootstrapNode: DRPNetworkNode;
	let node1PeerId: string;
	let node2PeerId: string;
	let bootstrapNodePeerId: string;

	beforeAll(async () => {
		const configPath = `${__dirname}/../../../configs/local-bootstrap.json`;
		const bootstrapConfig = loadConfig(configPath);
		// update bootstrapConfig
		if (bootstrapConfig) {
			if (!bootstrapConfig.network_config) {
				bootstrapConfig.network_config = {}; // Initialize if not present
			}

			if (!bootstrapConfig.network_config.log_config) {
				bootstrapConfig.network_config.log_config = {}; // Initialize if not present
			}
			bootstrapConfig.network_config.log_config.level = "silent";
			bootstrapConfig.network_config.gossip_sub_config = {
				pruneBackoff: 10,
			};
		}
		bootstrapNode = new DRPNetworkNode(bootstrapConfig?.network_config);
		await bootstrapNode.start();
		bootstrapNodePeerId = bootstrapNode.peerId;

		node1 = new DRPNetworkNode({
			bootstrap_peers: [`/ip4/127.0.0.1/tcp/50000/ws/p2p/${bootstrapNode.peerId}`],
			pubsub_peer_discovery_interval: 1000,
			log_config: {
				level: "silent",
			},
			private_key_seed: "node1",
			gossip_sub_config: {
				pruneBackoff: 10,
				heartbeatInterval: 10,
			},
		});
		node2 = new DRPNetworkNode({
			bootstrap_peers: [`/ip4/127.0.0.1/tcp/50000/ws/p2p/${bootstrapNode.peerId}`],
			pubsub_peer_discovery_interval: 1000,
			log_config: {
				level: "silent",
			},
			private_key_seed: "node2",
			gossip_sub_config: {
				pruneBackoff: 10,
				heartbeatInterval: 10,
			},
		});

		await Promise.all([node1.start(), node2.start()]);
		node1PeerId = node1.peerId;
		node2PeerId = node2.peerId;

		const result = await Promise.all([node1.isDiablable(), node2.isDiablable()]);
		expect(result[0]).toBe(true);
		expect(result[1]).toBe(true);
	});

	test("Node can discovery", async () => {
		expect(await node1.waitForPeer(bootstrapNodePeerId)).toBe(true);
		expect(await node2.waitForPeer(bootstrapNodePeerId)).toBe(true);
		expect(await node1.waitForPeer(node2PeerId)).toBe(true);
		expect(await node2.waitForPeer(node1PeerId)).toBe(true);
	});

	test("Node can send message to peer", async () => {
		const data = "Hello World!";
		let boolean = false;

		expect(await node1.waitForUpgradedConnection(node2PeerId)).toBe(true);

		const messageProcessed = new Promise((resolve) => {
			node2
				.addMessageHandler(async ({ stream }) => {
					const byteArray = await streamToUint8Array(stream);
					const message = NetworkPb.Message.decode(byteArray);
					expect(Buffer.from(message.data).toString("utf-8")).toBe(data);
					boolean = true;
					resolve(true);
				})
				.catch((e) => {
					console.error(e);
				});
		});

		await node1.sendMessage(node2PeerId, {
			sender: "",
			type: 0,
			data: new Uint8Array(Buffer.from(data)),
		});

		await messageProcessed;
		expect(boolean).toBe(true);
	});

	test("Node can send message to group", async () => {
		const data = "Hello Group!";
		const group = "test";
		let boolean = false;

		node2.subscribe(group);
		const messageProcessed = new Promise((resolve) => {
			node2.addGroupMessageHandler(group, async (e) => {
				const message = NetworkPb.Message.decode(e.detail.msg.data);
				expect(Buffer.from(message.data).toString("utf-8")).toBe(data);
				boolean = true;
				resolve(true);
			});
		});

		await node1.isSubscribed(group, node2.libp2pPeerId());
		await node1.broadcastMessage(group, {
			sender: "",
			type: 0,
			data: new Uint8Array(Buffer.from(data)),
		});
		await messageProcessed;

		expect(boolean).toBe(true);
	}, 10000);
});
