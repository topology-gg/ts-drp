import { Command, Option } from "commander";
import { DRPNode } from "@ts-drp/node";

export const program = new Command();
program.version("0.0.1");

// program.addOption(
// 	new Option("--ip <address>", "IPv4 address of the node"),
// );
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
		],
		private_key_seed: opts.seed,
	},
});

await node.start();
