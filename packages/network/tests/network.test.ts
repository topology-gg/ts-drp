import { loadConfig } from "@topology-foundation/node/src/config.js";
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
		}
		bootstrapNode = new DRPNetworkNode(bootstrapConfig?.network_config);
		await bootstrapNode.start();
		bootstrapNodePeerId = bootstrapNode.peerId;

		node1 = new DRPNetworkNode({
			bootstrap_peers: [
				`/ip4/127.0.0.1/tcp/50000/ws/p2p/${bootstrapNode.peerId}`,
			],
			discovery_interval: 1000,
			log_config: {
				level: "silent",
			},
		});
		node2 = new DRPNetworkNode({
			bootstrap_peers: [
				`/ip4/127.0.0.1/tcp/50000/ws/p2p/${bootstrapNode.peerId}`,
			],
			discovery_interval: 1000,
			log_config: {
				level: "silent",
			},
		});

		await Promise.all([node1.start(), node2.start()]);
		await node2.start();
		await node1.start();
		node1PeerId = node1.peerId;
		node2PeerId = node2.peerId;

		await Promise.all([node1.isDiablable(), node2.isDiablable()]);
	});

	test("Node can discovery", async () => {
		const node1peers = node1.getAllPeers();
		expect(node1peers.includes(node2PeerId)).toBe(true);
		expect(node1peers.includes(bootstrapNodePeerId)).toBe(true);

		const node2peers = node2.getAllPeers();
		expect(node2peers.includes(node1PeerId)).toBe(true);
		expect(node2peers.includes(bootstrapNodePeerId)).toBe(true);
	}, 10000);

	test("Node can send message to peer", async () => {
		const data = "Hello World!";
		let boolean = false;

		const messageProcessed = new Promise((resolve) => {
			node2.addMessageHandler(async ({ stream }) => {
				const byteArray = await streamToUint8Array(stream);
				const message = NetworkPb.Message.decode(byteArray);
				expect(Buffer.from(message.data).toString("utf-8")).toBe(data);
				boolean = true;
				resolve(true);
			});
		});

		await node1.sendMessage(node2PeerId, {
			sender: "",
			type: 0,
			data: new Uint8Array(Buffer.from(data)),
		});

		await messageProcessed;
		expect(boolean).toBe(true);
	}, 10000);

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
