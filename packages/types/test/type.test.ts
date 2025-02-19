import { describe, expect, test } from "vitest";

import { ObjectPb, MessagesPb } from "../src/index.js";

describe("Type", () => {
	test("should be a string", () => {
		expect(typeof ObjectPb).toBe("object");
		expect(typeof MessagesPb).toBe("object");
	});
});
