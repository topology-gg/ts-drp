# DRP Node

This package provides the implementation of a DRP Node, which is a node in a network that can be connected to other nodes and exchange messages with them.
The DRP Node is the entrypoint for interacting with the DRP protocol in the network.

## Usage

DRP Node can be used using the CLI or integrated into an existing application.

### CLI

The CLI provides a simple way to start a DRP Node and connect it to other nodes in the network.
For more information on what are the commands available, run:

```bash
pnpm cli --help
```

#### Running a bootstrap node
You can run a bootstrap node using the following command:

```bash
pnpm cli -m bootstrap --config configs/bootstrap.json
```

### Integration

To integrate the DRP Node into an existing application, you can install it using:

```bash
pnpm install @ts-drp/node
```

Then, you can import the DRP Node class and create a new instance:

```javascript
import { DRPNode } from '@ts-drp/node';

const node = new DRPNode();

// Start the node
node.start();
```
