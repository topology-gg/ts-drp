import tseslint from "typescript-eslint";

import { baseConfig } from "../../eslint.config.mjs";

const mergedPlugins = baseConfig
	.flatMap((config) => config.plugins || [])
	.reduce((acc, plugin) => ({ ...acc, ...plugin }), {});
const mergedRules = baseConfig
	.flatMap((config) => config.rules || [])
	.reduce((acc, rules) => ({ ...acc, ...rules }), {});

/** @type {import("typescript-eslint").ConfigArray} */
const config = tseslint.config(...baseConfig, {
	files: ["**/*.{ts,js,tsx}"],
	plugins: {
		...mergedPlugins,
	},
	rules: {
		...mergedRules,
	},
});

export default config;
