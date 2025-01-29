export type waitFunction = (
	resolve: (value: boolean) => void,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	reject: (reason?: any) => void
) => void;

export async function waitForEvent(fn: waitFunction, timeout = 5000) {
	return new Promise<boolean>((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			resolve(false);
		}, timeout);

		try {
			fn(
				(value) => {
					clearTimeout(timeoutId);
					resolve(value);
				},
				(error) => {
					clearTimeout(timeoutId);
					reject(error);
				}
			);
		} catch (error) {
			clearTimeout(timeoutId);
			reject(error);
		}
	});
}
