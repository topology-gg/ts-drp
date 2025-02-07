import { expect, test } from "vitest";

import { deserializeValue, serializeValue } from "../src/index.js";

test("Serialize & deserialize correctly", () => {
	const obj = { a: 1, b: 2 };
	const serialized = serializeValue(obj);
	const deserialized = deserializeValue(serialized);
	expect(deserialized).toEqual(obj);
});
