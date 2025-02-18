export interface IMetrics {
	traceFunc<Args extends unknown[], Return>(
		name: string,
		fn: (...args: Args) => Return
	): (...args: Args) => Return;
}
