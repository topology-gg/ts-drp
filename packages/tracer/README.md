# Tracer

This package provides tracing capabilities using OpenTelemetry and Jaeger.

## Local Development Setup

### Prerequisites

- Docker and Docker Compose installed on your machine

### Setting up Jaeger

1. Navigate to the tracer package directory:

```bash
cd packages/tracer
```

2. Start the Jaeger and NGINX services using docker-compose:

```bash
docker-compose -f docker/docker-compose.yml up -d
```

This will start:
- Jaeger all-in-one container with the UI available at http://localhost:16686
- NGINX reverse proxy for CORS handling

### Usage

```typescript
import { enableTracing, traceFunc } from "@ts-drp/tracer";

// Enable tracing for your service
// Enable tracing for your service
enableTracing("your-service-name", {
	provider: {
		serviceName: "your-service", // Optional, defaults to "unknown_service"
		exporterUrl: "http://localhost:4318/v1/traces", // Optional
		exporterHeaders: {
			// Optional
			"Content-Type": "application/json",
			"Access-Control-Allow-Headers": "*",
			"Access-Control-Allow-Origin": "*",
		},
	},
});

// Wrap functions to trace them
const tracedFunction = traceFunc(
	"operation-name",
	(param1, param2) => {
		// Your function logic here
		return result;
	},
	// Optional: Add custom attributes to the span
	(span, param1, param2) => {
		span.setAttribute("param1", param1);
		span.setAttribute("param2", param2);
	}
);

// The tracer supports various function types:
// - Synchronous functions
// - Async functions
// - Generator functions
// - Async Generator functions

// Example with async function
const tracedAsync = traceFunc("async-operation", async (id: string) => {
	const result = await fetchData(id);
	return result;
});

// Clean up (for testing purposes)
import { disableTracing, flush } from "@ts-drp/tracer";

// Force flush traces before shutdown
await flush();

// Disable tracing (typically only needed in tests)
disableTracing();
```

## Ports

- `16686`: Jaeger UI
- `4318`: OTLP HTTP receiver (NGINX proxy)

## Viewing Traces

1. Open http://localhost:16686 in your browser
2. Select your service from the "Service" dropdown
3. Click "Find Traces" to view your application's traces

## Stopping the Services

To stop the services:

```bash
docker-compose -f docker/docker-compose.yml down
```
