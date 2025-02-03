import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		exclude: ["**/node_modules"],
		coverage: {
			enabled: true,
			reporter: ["text", "lcov"],
			include: ["packages/**/*.{ts,tsx}"],
			exclude: [
				"**/node_modules/**",
				"**/__tests__/**",
				"**/tests/**",
				"**/proto/**",
				"**/dist/**",
				"packages/logger/src/**",
				"packages/node/src/run.ts",
				"packages/node/src/cli/**",
				"packages/node/src/version.ts",
				"packages/node/src/rpc/**",
				"packages/node/src/config.ts",
			],
		},
	},
});
