import { DRPCredentialStore } from "@ts-drp/keychain/src/credential.js";
import { beforeAll, describe, expect, test } from "vitest";

import { DRPNetworkNode } from "../src/node.js";

describe("isDialable", () => {
	let btNode: DRPNetworkNode;
	let credentialStore: DRPCredentialStore;
	beforeAll(async () => {
		credentialStore = new DRPCredentialStore({
			private_key_seed: "bootstrap_is_dialable",
		});
		await credentialStore.start();
		btNode = new DRPNetworkNode({
			bootstrap: true,
			listen_addresses: ["/ip4/0.0.0.0/tcp/0/ws"],
			bootstrap_peers: [],
		});
		await btNode.start(credentialStore.getEd25519PrivateKey());
	});

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

	test("should return true if the node is dialable", async () => {
		const credentialStore1 = new DRPCredentialStore({
			private_key_seed: "is_dialable_node_1",
		});
		await credentialStore1.start();
		const node = new DRPNetworkNode({
			bootstrap_peers: btNode.getMultiaddrs()?.map((addr) => addr.toString()) || [],
		});
		await node.start(credentialStore1.getEd25519PrivateKey());
		expect(await isDialable(node)).toBe(true);
	});

	test("should return false if the node is not dialable", async () => {
		const credentialStore2 = new DRPCredentialStore({
			private_key_seed: "is_dialable_node_2",
		});
		await credentialStore2.start();
		const node = new DRPNetworkNode({
			bootstrap_peers: btNode.getMultiaddrs()?.map((addr) => addr.toString()) || [],
			listen_addresses: [],
		});
		await node.start(credentialStore2.getEd25519PrivateKey());
		expect(await isDialable(node, true)).toBe(false);
	});
});
