/* eslint-disable @typescript-eslint/no-explicit-any */
import Anthropic from "@anthropic-ai/sdk";

import { systemPrompt } from "./constants";
import { handlers } from "./starknet";
import { tools } from "./tools";

const client = new Anthropic({
	apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
	dangerouslyAllowBrowser: true,
});

export async function generateAIResponse(messages: string[]): Promise<string> {
	const prompt = `
	${systemPrompt}

	----------

	Chat history: ${messages.join("\n")}
	`;

	const completion = await client.messages.create({
		max_tokens: 64,
		messages: [{ role: "user", content: prompt }],
		model: "claude-3-5-sonnet-latest",
		// tools: tools.map((tool) => {
		// 	const properties = [];
		// 	const required = [];
		// 	for (const value of Object.values(tool.input_schema?.definitions || {})) {
		// 		properties.push(...(value as any).properties);
		// 		required.push(...(value as any).required);
		// 	}
		// 	return {
		// 		name: tool.name,
		// 		description: tool.description,
		// 		input_schema: {
		// 			type: "object",
		// 			properties,
		// 			required,
		// 		},
		// 	};
		// }),
	});

	let response = "";
	for (const block of completion.content) {
		if (block.type === "text") {
			response += block.text;
		}
		if (block.type === "tool_use") {
			const tool = tools.find((tool) => tool.name === block.name);
			if (tool) {
				const result = await handlers[tool.name as keyof typeof handlers](block.input);
				response += result;
			}
		}
	}

	console.log(">>> prompting with", prompt);
	return response;
}
