import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { waitForEvent } from "../src/utils/waiter.js"; // Note the .js extension

describe("waitForEvent", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should resolve with true when event occurs before timeout", async () => {
		const waitFn = (resolve: (value: boolean) => void) => {
			setTimeout(() => resolve(true), 1000);
		};

		const promise = waitForEvent(waitFn);
		await vi.advanceTimersByTimeAsync(1000);
		const result = await promise;

		expect(result).toBe(true);
	});

	it("should resolve with false when timeout occurs", async () => {
		const waitFn = (resolve: (value: boolean) => void) => {
			setTimeout(() => resolve(true), 6000); // Longer than default timeout
		};

		const promise = waitForEvent(waitFn);
		await vi.advanceTimersByTimeAsync(5000); // Default timeout
		const result = await promise;

		expect(result).toBe(false);
	});

	it("should respect custom timeout", async () => {
		const waitFn = (resolve: (value: boolean) => void) => {
			setTimeout(() => resolve(true), 3000);
		};

		const promise = waitForEvent(waitFn, 2000); // Custom timeout of 2 seconds
		await vi.advanceTimersByTimeAsync(2000);
		const result = await promise;

		expect(result).toBe(false);
	});

	it("should handle rejection from wait function", async () => {
		const error = new Error("Test error");
		const waitFn = (_: (value: boolean) => void, reject: (reason?: unknown) => void) => {
			reject(error);
		};

		await expect(waitForEvent(waitFn)).rejects.toThrow("Test error");
	});

	it("should handle thrown errors in wait function", async () => {
		const waitFn = () => {
			throw new Error("Test error");
		};

		await expect(waitForEvent(waitFn)).rejects.toThrow("Test error");
	});
});
