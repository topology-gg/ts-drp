import { describe, test } from "vitest";
import { run } from "../src/run.js";

describe("Run DRP with cli", () => {
	test("Run with cli", async () => {
		setTimeout(() => {
			run();
		}, 500);
	});
});
