import eslint from "@eslint/js";
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tsparser from "@typescript-eslint/parser";
import esimport from "eslint-plugin-import";
import prettier from "eslint-plugin-prettier";
import unusedImports from "eslint-plugin-unused-imports";
import vitest from "eslint-plugin-vitest";
import globals from "globals";
import tseslint from "typescript-eslint";

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
			"**/serializer.ts",
		],
	},
	eslint.configs.recommended,
	tseslint.configs.strict,
	{
		files: ["**/*.{js,ts,jsx,tsx}"],
		plugins: {
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh,
			"@typescript-eslint": tseslint.plugin,
			"import": esimport,
			"prettier": prettier,
			"unused-imports": unusedImports,
			"vitest": vitest,
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
				...globals.browser,
				...globals.node,
				...globals.es2021,
			},
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			'react-refresh/only-export-components': [
				'warn',
				{ allowConstantExport: true },
			],
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
		},
	}
];

/** @type {import("typescript-eslint").ConfigArray} */
const config = tseslint.config(...baseConfig);

export default config;
