# DRP Example

This is an example of a DRP usage in a chat system where a user can create or connect to a chat room, send and read the messages sent in the group chat.

## Specifics

Messages are represented as strings in the format (timestamp, content, senderId). Chat is a class which extends DRPObject and stores the list of messages.

## How to run locally

After cloning the repository, run the following commands:

```bash
cd ts-drp/examples/chat
pnpm i
pnpm dev
```
