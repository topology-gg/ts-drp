import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vite.dev/config/
export default defineConfig({
	build: {
		target: "esnext",
	},
	optimizeDeps: {
		esbuildOptions: {
			target: "esnext",
		},
	},
	plugins: [react(), nodePolyfills()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@ts-drp": path.resolve(__dirname, "../../packages"),
		},
	},
});
