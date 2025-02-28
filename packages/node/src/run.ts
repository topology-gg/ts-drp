import { DRPNodeConfig } from "@ts-drp/types";

import { program } from "./cli/index.js";
import { DRPNode } from "./index.js";
import { init as rpc_init } from "./rpc/index.js";
import { loadConfig } from "./utils/config.js";

export const run = async () => {
	program.parse(process.argv);
	const opts = program.opts();
	const config: DRPNodeConfig | undefined = loadConfig(opts.config);

	const node = new DRPNode(config);
	await node.start();
	rpc_init(node);
};

run().catch((e) => console.error("Failed to start node: ", e));
