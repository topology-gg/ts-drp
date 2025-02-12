# DRP Objects

This package provides a simple implementation of Distributed Real-Time Programs (DRPs).
DRPs are a type of composable programs that can be replicated across multiple nodes in a network,
and can be updated concurrently by multiple clients without the need for coordination.

## Usage

This package is intended to implement all the fuctionalities for the creation of custom DRPs.
Basic operations for synchronization are provided, but the implementation of the actual program behavior is left to the app developer.

For starting, you can install it using:

```bash
pnpm install @ts-drp/object
```

## Flamegraph

### Prerequisites

- `Golang` and `pprof` install

### How to run

```
pnpm run flamegraph
```

### Visualize Profile

```
pprof -http=:8080 flamegraph.pb.gz
```
and preview in browser at `http://localhost:8080`

