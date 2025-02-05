import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
	"./vite.config.mts",
	"./examples/grid/vite.config.mts",
	"./examples/local-bootstrap/vite.config.mts",
	"./examples/canvas/vite.config.mts",
	"./examples/chat/vite.config.mts",
]);
