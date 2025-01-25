import { MapDRP } from "@ts-drp/blueprints";
import { beforeAll, describe, expect, test } from "vitest";
import { DRPNode } from "../src/index.js";

describe("Topic discovery", () => {
	let node1: DRPNode;
	let node2: DRPNode;
	let node3: DRPNode;

	beforeAll(async () => {
		node1 = new DRPNode({
			network_config: {
				listen_addresses: ["/ip4/0.0.0.0/tcp/0/ws"],
				private_key_seed: "topic_discovery_peer_1",
				discovery_interval: Number.POSITIVE_INFINITY, // we don't want to discover peers
				bootstrap_peers: [],
				discovery: false,
			},
			log_config: {
				level: "silent",
			},
		});
		node2 = new DRPNode({
			network_config: {
				listen_addresses: ["/ip4/0.0.0.0/tcp/0/ws"],
				private_key_seed: "topic_discovery_peer_2",
				discovery_interval: Number.POSITIVE_INFINITY,
				bootstrap_peers: [],
				discovery: false,
			},
			log_config: {
				level: "silent",
			},
		});
		node3 = new DRPNode({
			network_config: {
				listen_addresses: ["/ip4/0.0.0.0/tcp/0/ws"],
				private_key_seed: "topic_discovery_peer_3",
				discovery_interval: Number.POSITIVE_INFINITY,
				bootstrap_peers: [],
				discovery: false,
			},
			log_config: {
				level: "silent",
			},
		});

		await Promise.all([node1.start(), node2.start(), node3.start()]);
		const node2MA = node2.networkNode.getMultiaddrs();
		if (!node2MA) throw new Error("No multiaddrs");

		await Promise.all([
			node1.networkNode.connect(node2MA),
			node3.networkNode.connect(node2MA),
			//node1.networkNode.connect(node3.networkNode.getMultiaddrs() || []),
		]);

		await Promise.all([
			node1.networkNode.waitForPeer(node2.networkNode.peerId.toString()),
			node3.networkNode.waitForPeer(node2.networkNode.peerId.toString()),
		]);
	});

	test("peer 1 can discover peer 3 topic", async () => {
		const drp = new MapDRP();
		drp.set("topic", "value");
		const drpObject = await node1.createObject({
			drp: drp,
			id: "test_topic_discovery",
		});

		await node3.connectObject({
			id: drpObject.id,
		});

		expect(
			await node3.networkNode.isSubscribed(
				drpObject.id,
				node1.networkNode.libp2pPeerId(),
			),
		).toBe(true);
	}, 10000);
});
