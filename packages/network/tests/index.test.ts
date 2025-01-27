import { beforeAll, describe, expect, test } from "vitest";

import { DRPNetworkNode } from "../src/index.js";

describe("isDialable test suite", () => {
	let btNode: DRPNetworkNode;

	beforeAll(async () => {
		btNode = new DRPNetworkNode({
			listen_addresses: ["/ip4/0.0.0.0/tcp/0/ws"],
			bootstrap: true,
			bootstrap_peers: [],
			peer_discovery: false,
		});
		await btNode.start();
	});

	test("should return true if the bt node is dialable", async () => {
		const isDialable = await btNode.isDialable();
		expect(isDialable).toBe(true);
	});

	test("should return false if the normal node is dialable through the bt node", async () => {
		const normalNode = new DRPNetworkNode({
			bootstrap_peers: btNode.getMultiaddrs() ?? [],
			peer_discovery: false,
		});
		await normalNode.start();
		const isDialable = await normalNode.isDialable();
		expect(isDialable).toBe(true);
	});

	test("should return false if the normal node is not dialable through the bt node", async () => {
		const normalNode = new DRPNetworkNode({
			bootstrap_peers: [],
			peer_discovery: false,
		});
		await normalNode.start();
		const isDialable = await normalNode.isDialable(100);
		expect(isDialable).toBe(false);
	});
});
