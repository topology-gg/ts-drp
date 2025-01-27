import { Command, Option } from "commander";
import { DRPNode } from "@ts-drp/node";

export const program = new Command();
program.version("0.0.1");

program.addOption(
	new Option("--ip <address>", "IPv4 address of the node"),
);
program.addOption(new Option("--seed <seed>", "private key seed"));

program.parse(process.args);
const opts = program.opts();

const node = new DRPNode({
	network_config: {
		bootstrap_peers: [
			"/ip4/11.0.0.1/tcp/50000/ws/p2p/12D3KooWKjB6eL6MuQU1MFbntjEc7VCPL7CjZZQdwgrtGKLcbu2j",
			"/ip4/11.0.0.2/tcp/50000/ws/p2p/12D3KooWDJaY43wjhMd4Ud1yitJvs7iBwQVwUSX9vUaqNkN44krj",
			"/ip4/11.0.0.3/tcp/50000/ws/p2p/12D3KooWHbt21F3D78mcHoBrUEHpovbmaFXYDNDnCchGmPcKA3so",
			"/ip4/11.0.0.4/tcp/50000/ws/p2p/12D3KooWNsLr5e8axCMNJW71nKLijQiBPthVYS7fvMhqfqL2GpfM",

			// "/ip4/11.0.0.1/tcp/50000/ws/p2p/12D3KooWHzRtpN5F3RwnNyygTkaTEymtWy1HQ5kSURKQe8pRdksA",
			// "/ip4/11.0.0.2/tcp/50000/ws/p2p/12D3KooWDRX6cHq3mDdq13Q7aDv9GXHYcs1GJKdky3iGPZ1YYyPb",
			// "/ip4/11.0.0.3/tcp/50000/ws/p2p/12D3KooWM43k6rCvqqr5Y38CneFGrUuGp9u4QPVCEfYZ5pX6wvzA",
			// "/ip4/11.0.0.4/tcp/50000/ws/p2p/12D3KooWH6P7vHkTp5aGTYvZrk3CA8FNyLe4A2ZkRnEpqJJU38px",
			// "/ip4/11.0.0.5/tcp/50000/ws/p2p/12D3KooWPh4VTxayNJ8xS5B8Puh8Kv2JnsCf6qLPeuL8E9vsqnoB",
			// "/ip4/11.0.0.6/tcp/50000/ws/p2p/12D3KooWRbRMLp7vkb6xApmu8tRbxGKFnybJ8TXcDRQGJGW6b47P",
			// "/ip4/11.0.0.7/tcp/50000/ws/p2p/12D3KooWHA9oFWVfN5YFmP4yxvZCTCdayvuFdXV1mxtkFhmQsghK",
			// "/ip4/11.0.0.8/tcp/50000/ws/p2p/12D3KooWKwffUK9UZFwrSWZ83f4LTn952nQEeBYAZzbBVzHHeha7",
		],
		private_key_seed: opts.seed,
	},
});

await node.start();
