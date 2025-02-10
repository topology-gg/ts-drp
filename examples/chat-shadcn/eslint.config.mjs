import { baseConfig } from '../../eslint.config.mjs'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

const mergedPlugins = baseConfig.flatMap(config => config.plugins || []).reduce((acc, plugin) => ({ ...acc, ...plugin }), {});
const mergedRules = baseConfig.flatMap(config => config.rules || []).reduce((acc, rules) => ({ ...acc, ...rules }), {});

/** @type {import("typescript-eslint").ConfigArray} */
const config = tseslint.config(
  ...baseConfig,
  {
    files: ["**/*.{ts,js,tsx}"],
    languageOptions: {
      ecmaVersion: 2021,
      globals: { ...globals.browser },
    },
    plugins: {
      ...mergedPlugins,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...mergedRules,
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  }
);

export default config;
