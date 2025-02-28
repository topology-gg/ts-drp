import eslint from "@eslint/js";
import tsparser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-plugin-prettier";
import unusedImports from "eslint-plugin-unused-imports";
import vitest from "eslint-plugin-vitest";
import globals from "globals";
import { config as tsLintConfig, configs, plugin } from "typescript-eslint";

/** @type {import("typescript-eslint").InfiniteDepthConfigWithExtends[]} */
export const baseConfig = [
	{
		ignores: [
			"**/.env",
			"**/.DS_Store",
			"**/.gitignore",
			"**/.prettierignore",
			"**/.vscode/*",
			"**/node_modules/*",
			"**/dist/*",
			"**/docs/*",
			"**/doc/*",
			"**/bundle/*",
			"**/coverage/*",
			"**/flamegraph.*",
			"**/tsconfig.tsbuildinfo",
			"**/benchmark-output.txt",
			"**/*.log",
			"**/*_pb.js",
			"**/*_pb.ts",
		],
	},
	eslint.configs.recommended,
	configs.strict,
	importPlugin.flatConfigs.recommended,
	importPlugin.flatConfigs.typescript,
	{
		plugins: {
			"@typescript-eslint": plugin,
			"prettier": prettier,
			"unused-imports": unusedImports,
			"vitest": vitest,
		},
		settings: {
			"import/resolver": {
				typescript: {},
			},
		},
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				ecmaVersion: 2021,
				sourceType: "module",
				tsconfigRootDir: import.meta.dirname,
				project: "./tsconfig.json",
			},
			globals: {
				...globals.node,
				...globals.es2021,
			},
		},
		rules: {
			"prettier/prettier": "error",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					varsIgnorePattern: "_",
					argsIgnorePattern: "_",
					caughtErrors: "all",
					caughtErrorsIgnorePattern: "_",
				},
			],
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/explicit-module-boundary-types": "off",
			"@typescript-eslint/no-dynamic-delete": "off",
			"@typescript-eslint/no-inferrable-types": "off",
			"@typescript-eslint/no-floating-promises": "error",
			"import/no-self-import": "error",
			"import/no-duplicates": "error",
			"import/no-named-default": "error",
			"import/no-webpack-loader-syntax": "error",
			"@typescript-eslint/consistent-type-exports": "error",
			"no-unused-vars": "off",
			"unused-imports/no-unused-imports": "error",
			"prefer-const": "error",
			"import/order": [
				"error",
				{
					"groups": [["builtin", "external", "internal"]],
					"newlines-between": "always",
					"alphabetize": {
						order: "asc",
						caseInsensitive: true,
					},
				},
			],
			"import/no-cycle": "error",
		},
	},
];

/** @type {import("typescript-eslint").ConfigArray} */
const config = tsLintConfig(...baseConfig);

export default config;
