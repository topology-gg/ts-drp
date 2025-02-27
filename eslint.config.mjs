import eslint from "@eslint/js";
import tsparser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-plugin-prettier";
import unusedImports from "eslint-plugin-unused-imports";
import vitest from "eslint-plugin-vitest";
import globals from "globals";
import path from "path";
import { config as tsLintConfig, configs, plugin } from "typescript-eslint";
//
//const typeScriptExtensions = [".ts", ".cts", ".mts", ".tsx"];

//const allExtensions = [...typeScriptExtensions, ".js", ".jsx", ".mjs", ".cjs"];

const config = tsLintConfig(
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
			"import/external-module-folders": [
				"node_modules",
				"node_modules/@types",
				path.resolve(import.meta.dirname, "node_modules"),
			],
			"import/resolver": {
				typescript: {},
				node: {
					moduleDirectory: ["node_modules", path.resolve(import.meta.dirname, "node_modules"), "."],
				},
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
	}
);

export default config;
