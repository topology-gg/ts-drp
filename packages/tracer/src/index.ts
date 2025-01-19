import { type Span, SpanStatusCode, context, trace } from "@opentelemetry/api";
import { AsyncHooksContextManager } from "@opentelemetry/context-async-hooks";
import { ZoneContextManager } from "@opentelemetry/context-zone-peer-dep";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import {
	type Tracer as OtTracer,
	SimpleSpanProcessor,
	WebTracerProvider,
} from "@opentelemetry/sdk-trace-web";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

let enabled = false;
let tracer: OtTracer | undefined;
let provider: WebTracerProvider | undefined;
let exporter: OTLPTraceExporter | undefined;

const DEFAULT_EXPORTER_URL = "http://127.0.0.1:9999/v1/traces";
const DEFAULT_EXPORTER_HEADERS = {
	"Content-Type": "application/json",
	"Access-Control-Allow-Headers": "*",
	"Access-Control-Allow-Origin": "*",
};
const isWeb = typeof window !== "undefined";

export type EnableTracingOptions = {
	provider?: {
		serviceName?: string;
		exporterUrl?: string;
		exporterHeaders?: Record<string, string>;
	};
};

export const enableTracing = (
	tracerName: string,
	opts: EnableTracingOptions = {},
): void => {
	enabled = true;
	initContextManager();
	initProvider(opts.provider);

	if (provider) {
		tracer = provider.getTracer(tracerName) as OtTracer;
	}
};

export const disableTracing = (): void => {
	enabled = false;
};

const initContextManager = (): void => {
	if (!isWeb) {
		const contextManager = new AsyncHooksContextManager();
		contextManager.enable();
		context.setGlobalContextManager(contextManager);
		return;
	}

	const contextManager = new ZoneContextManager();
	contextManager.enable();
	context.setGlobalContextManager(contextManager);
};

function isPromise<T>(obj: unknown): obj is Promise<T> {
	return typeof (obj as { then?: unknown })?.then === "function";
}

async function wrapPromise<T>(promise: Promise<T>, span: Span): Promise<T> {
	return promise
		.then((res) => {
			span.setStatus({ code: SpanStatusCode.OK });
			return res;
		})
		.catch((err: Error) => {
			span.recordException(err);
			span.setStatus({ code: SpanStatusCode.ERROR, message: err.toString() });
			throw err;
		})
		.finally(() => {
			span.end();
		});
}

function isGenerator(obj: unknown): obj is Generator {
	return (obj as { [Symbol.iterator]?: unknown })?.[Symbol.iterator] != null;
}

function wrapGenerator<T>(gen: Generator<T>, span: Span): Generator<T> {
	const iter = gen[Symbol.iterator]();

	const wrapped: Generator<T> = {
		next: () => {
			try {
				const res = iter.next();

				if (res.done === true) {
					span.setStatus({ code: SpanStatusCode.OK });
					span.end();
				}
				return res;
			} catch (err) {
				const error = err instanceof Error ? err : new Error(String(err));
				span.recordException(error);
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: error.toString(),
				});
				span.end();

				throw error;
			}
		},
		return: (value) => {
			return iter.return(value);
		},
		throw: (err) => {
			return iter.throw(err);
		},
		[Symbol.iterator]: () => {
			return wrapped;
		},
	};

	return wrapped;
}

function isAsyncGenerator(obj: unknown): obj is AsyncGenerator {
	return (
		(obj as { [Symbol.asyncIterator]?: unknown })?.[Symbol.asyncIterator] !=
		null
	);
}

function wrapAsyncGenerator<T>(
	gen: AsyncGenerator<T>,
	span: Span,
): AsyncGenerator<T> {
	const iter = gen[Symbol.asyncIterator]();

	const wrapped: AsyncGenerator<T> = {
		next: async () => {
			try {
				const res = await iter.next();

				if (res.done === true) {
					span.setStatus({ code: SpanStatusCode.OK });
					span.end();
				}
				return res;
			} catch (err) {
				const error = err instanceof Error ? err : new Error(String(err));
				span.recordException(error);
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: error.toString(),
				});
				span.end();

				throw error;
			}
		},
		return: async (value) => {
			return iter.return(value);
		},
		throw: async (err) => {
			return iter.throw(err);
		},
		[Symbol.asyncIterator]: () => {
			return wrapped;
		},
	};

	return wrapped;
}

export function traceFunc<Args extends unknown[], Return>(
	name: string,
	fn: (...args: Args) => Return,
	setAttributes?: (span: Span, ...args: Args) => void,
): (...args: Args) => Return {
	return (...args: Args): Return => {
		if (!tracer || !enabled) return fn(...args);
		const parentContext = context.active();
		const span = tracer.startSpan(name, {}, parentContext);

		if (setAttributes) {
			setAttributes(span, ...args);
		}

		let result: Return;
		const childContext = trace.setSpan(parentContext, span);
		try {
			result = context.with(childContext, fn, undefined, ...args);
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err));
			span.recordException(error);
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: error.toString(),
			});
			span.end();
			throw error;
		}

		if (isPromise<unknown>(result)) {
			return wrapPromise(result, span) as Return;
		}
		if (isGenerator(result)) {
			return wrapGenerator(result, span) as Return;
		}
		if (isAsyncGenerator(result)) {
			return wrapAsyncGenerator(result, span) as Return;
		}

		span.setStatus({ code: SpanStatusCode.OK });
		span.end();
		return result;
	};
}

const initExporter = (
	opts: EnableTracingOptions["provider"],
): OTLPTraceExporter => {
	if (exporter) return exporter;

	exporter = new OTLPTraceExporter({
		url: opts?.exporterUrl ?? DEFAULT_EXPORTER_URL,
		headers: opts?.exporterHeaders
			? opts.exporterHeaders
			: DEFAULT_EXPORTER_HEADERS,
	});

	return exporter;
};

const initProvider = (opts: EnableTracingOptions["provider"]): void => {
	if (provider) return;

	const resource = new Resource({
		[ATTR_SERVICE_NAME]: opts?.serviceName ?? "unknown_service",
	});

	provider = new WebTracerProvider({
		resource,
		spanProcessors: [new SimpleSpanProcessor(initExporter(opts))],
	});

	provider.register();
};

export const flush = async (): Promise<void> => {
	await provider?.forceFlush();
};
