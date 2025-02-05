# DRP Example

This is an example of a DRP usage in a chat system where a user can create or connect to a chat room, send and read the messages sent in the group chat.

## Specifics

Messages are represented as strings in the format (timestamp, content, senderId). Chat is a class which extends DRPObject and stores the list of messages.

## AI Bot

The chat example now includes an AI bot that sends messages at regular intervals. The AI bot is instantiated and added to the chat room when a user creates or joins a room. The AI bot uses the OpenAI library to generate responses and send them as chat messages.

## How to run locally

After cloning the repository, run the following commands:

```bash
cd ts-drp/examples/chat
pnpm i
pnpm dev
```

## Setting up OpenAI

To use the AI bot, you need to set up the OpenAI library. Follow these steps:

1. Create an account on the OpenAI website and obtain an API key.
2. Create a `.env` file in the `examples/chat` directory and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```
3. Restart the development server to apply the changes.
