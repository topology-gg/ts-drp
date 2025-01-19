import { program } from "./cli/index.js";
import { loadConfig } from "./config.js";
import { DRPNode } from "./index.js";
import type { DRPNodeConfig } from "./index.js";
import { init as rpc_init } from "./rpc/index.js";

const run = async () => {
	program.parse(process.argv);
	const opts = program.opts<{ config: string }>();
	const config: DRPNodeConfig | undefined = loadConfig(opts.config);

	const node = new DRPNode(config);
	await node.start();
	rpc_init(node);
};

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
