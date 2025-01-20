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
			log_config: {
				level: "silent",
			},
		});
		await node1.start();
		node1PeerId = node1.peerId;

		node2 = new DRPNetworkNode({
			bootstrap_peers: [
				`/ip4/127.0.0.1/tcp/50000/ws/p2p/${bootstrapNode.peerId}`,
			],
			log_config: {
				level: "silent",
			},
		});
		await node2.start();
		node2PeerId = node2.peerId;
	});

	test("Node can discovery", async () => {
		await new Promise((resolve) => setTimeout(resolve, 10000));

		const node1peers = node1.getAllPeers();
		expect(node1peers.includes(node2PeerId)).toBe(true);
		expect(node1peers.includes(bootstrapNodePeerId)).toBe(true);

		const node2peers = node2.getAllPeers();
		expect(node2peers.includes(node1PeerId)).toBe(true);
		expect(node2peers.includes(bootstrapNodePeerId)).toBe(true);
	}, 20000);

	test("Node can send message to peer", async () => {
		const data = "Hello World!";
		let boolean = false;
		node2.addMessageHandler(async ({ stream }) => {
			const byteArray = await streamToUint8Array(stream);
			const message = NetworkPb.Message.decode(byteArray);
			expect(Buffer.from(message.data).toString("utf-8")).toBe(data);
			boolean = true;
		});
		await new Promise((resolve) => setTimeout(resolve, 2000));
		node1.sendMessage(node2PeerId, {
			sender: "",
			type: 0,
			data: new Uint8Array(Buffer.from(data)),
		});
		await new Promise((resolve) => setTimeout(resolve, 2000));
		expect(boolean).toBe(true);
	});

	// test("Node can send message to group", async () => {
	// 	const data = "Hello Group!";
	// 	let boolean = false;
	// 	node2.addGroupMessageHandler("test", async (e) => {
	// 		expect(Buffer.from(e.detail.msg.data).toString("utf-8")).toBe(data);
	// 		boolean = true;
	// 	});
	// 	await new Promise((resolve) => setTimeout(resolve, 5000));
	// 	await node1.broadcastMessage("test", { sender: "", type: 0, data: new Uint8Array(Buffer.from(data)) });
	// 	await new Promise((resolve) => setTimeout(resolve, 5000));
	// 	expect(boolean).toBe(true);
	// }, 50000);
});
