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

const bootstrap_node = new DRPNode({
	network_config: {
		listen_addresses: ["/ip4/0.0.0.0/tcp/50000/ws", "/ip4/0.0.0.0/tcp/50001"],
		announce_addresses: [
			`/ip4/${opts.ip}/tcp/50000/ws`,
			`/ip4/${opts.ip}/tcp/50001`,
		],
		bootstrap: true,
		bootstrap_peers: [],
		private_key_seed: opts.seed,
	},
});

await bootstrap_node.start();
