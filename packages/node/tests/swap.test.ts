import { ObjectACL, Vertex } from "@ts-drp/object";
import { describe, expect, test } from "vitest";

import { AddMulDRP } from "../../blueprints/src/AddMul/index.js";
import { DRPNode } from "../src/index.js";

describe("AddMulDRP", () => {
	const delay = (ms: number) =>
		new Promise((resolve) =>
			setTimeout(() => {
				resolve(true);
			}, ms)
		);
	// stream 1 <-> stream 2
	test("two nodes can communicate and modify the shared state", async () => {
		// Create two nodes
		const node1 = new DRPNode({
			network_config: {
				listen_addresses: ["/ip4/0.0.0.0/tcp/0/ws"],
				bootstrap_peers: [],
				private_key_seed: "add_mul_test_1",
				log_config: {
					level: "silent",
				},
				pubsub_peer_discovery_interval: 10,
			},
		});
		const node2 = new DRPNode({
			network_config: {
				listen_addresses: ["/ip4/0.0.0.0/tcp/0/ws"],
				bootstrap_peers: [],
				private_key_seed: "add_mul_test_2",
				log_config: {
					level: "silent",
				},
                pubsub_peer_discovery_interval: 10,
			},
		});


		// Start both nodes
		await node1.start();
		await node2.start();
		await Promise.all([node1.networkNode.isDialable(), node2.networkNode.isDialable()]);
		console.log("__P1__", node1.networkNode.peerId);
		console.log("__P2__", node2.networkNode.peerId);
        
		const acl = new ObjectACL({
			admins: new Map([
				[node1.networkNode.peerId, node1.credentialStore.getPublicCredential()],
				[node2.networkNode.peerId, node2.credentialStore.getPublicCredential()],
			]),
		});

		// Connect the nodes
		const addrs = node2.networkNode.getMultiaddrs();
		const addrs2 = node1.networkNode.getMultiaddrs();
		if (!addrs || addrs.length === 0) {
			throw new Error("Node 2 has no multiaddrs");
		}
		if (!addrs2 || addrs2.length === 0) {
			throw new Error("Node 1 has no multiaddrs");
		}
		await node1.networkNode.connect(addrs);
		await node2.networkNode.connect(addrs2);     

		await delay(100);

		// Subscribe to a common topic for the DRP
		const topic = "test-add-mul";
		const drp1 = await node1.createObject({
			drp: new AddMulDRP(),
			id: topic,
			acl,
			sync: {
				enabled: true,
			},
		});

		const drp2 = await node2.createObject({
			drp: new AddMulDRP(),
			id: topic,
			acl,
			sync: {
				enabled: true,
			},
		});

		await delay(100);
		const addMul1 = drp1.drp as AddMulDRP;
		const addMul2 = drp2.drp as AddMulDRP;

		addMul1.add(1);
        await delay(1000);

        expect(addMul2.query_value()).toBe(1);
        expect(addMul1.query_value()).toBe(1);

        addMul1.add(1);
        addMul2.mul(2);
        addMul1.mul(3);
        addMul2.add(2);
		await delay(1000);
		expect(addMul2.query_value()).toBe(addMul2.query_value());
	}, 5000);
});
