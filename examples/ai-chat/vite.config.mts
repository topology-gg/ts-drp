import path from "node:path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
	build: {
		target: "esnext",
	},
	plugins: [
		nodePolyfills({
			overrides: {},
		}),
	],
	optimizeDeps: {
		esbuildOptions: {
			target: "esnext",
		},
	},
	resolve: {
		alias: {
			"@ts-drp": path.resolve(__dirname, "../../packages"),
		},
	},
});
