import { beforeAll, describe, expect, test } from "vitest";

import { DRPNetworkNode } from "../src/node.js";

describe("isDialable", () => {
	let btNode: DRPNetworkNode;
	beforeAll(async () => {
		btNode = new DRPNetworkNode({
			bootstrap: true,
			listen_addresses: ["/ip4/0.0.0.0/tcp/0/ws"],
			bootstrap_peers: [],
			private_key_seed: "bootstrap_is_dialable",
		});
		await btNode.start();
	});

	test("should return true if the node is dialable", async () => {
		const node = new DRPNetworkNode({
			bootstrap_peers: btNode.getMultiaddrs()?.map((addr) => addr.toString()) || [],
			private_key_seed: "is_dialable_node_1",
		});
		await node.start();
		expect(await node.isDialable(100)).toBe(true);
	});

	test("should return false if the node is not dialable", async () => {
		const node = new DRPNetworkNode({
			bootstrap_peers: btNode.getMultiaddrs()?.map((addr) => addr.toString()) || [],
			private_key_seed: "is_dialable_node_2",
			listen_addresses: [],
		});
		await node.start();
		expect(await node.isDialable(100)).toBe(false);
	});
});
