import { DRPObject } from "@ts-drp/object";
// import Groq from "groq-sdk";
import React, { useCallback, useState } from "react";

// import { systemPrompt } from "@/lib/constants";
import { generateAIResponse } from "@/lib/agent";
import { animalEmojis } from "@/lib/emojis";
import { createOrJoinDRP, getChat, getNode } from "@/lib/node";
import { Chat, Message, Role } from "@/objects/chat";
import { UseChatOptions } from "@/types";

const MAX_MESSAGES = 20;

export type UseChatHelpers = {
	/** Current messages in the chat */
	messages: Message[];
	/** The current value of the input */
	input: string;
	/** setState-powered method to update the input value */
	setInput: React.Dispatch<React.SetStateAction<string>>;
	/** An input/textarea-ready onChange handler to control the value of the input */
	handleInputChange: (
		e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>
	) => void;
	/** Form submission handler to automatically reset input and append a user message */
	handleSubmit: (event?: { preventDefault?: () => void }) => void;

	/** handle create Chat */
	createChat: () => void;

	/** handle join Chat */
	joinChat: (id: string) => void;

	/** Whether the question has been submitted */
	questionSubmitted: boolean;

	/** The id of the chat */
	id: string | null;
};

// async function generateAIResponse(messages: string[]): Promise<string> {
// 	const prompt = `
// 	${systemPrompt}

// 	----------

// 	Chat history: ${messages.join("\n")}
// 	`;

// 	const completion = await groq.chat.completions.create({
// 		messages: [{ role: "user", content: prompt }],
// 		model: "llama-3.1-8b-instant", //'mixtral-8x7b-32768'
// 		temperature: 0.9,
// 		max_tokens: 200,
// 	});
// 	console.log(">>> prompting with", prompt);
// 	return completion.choices[0]?.message?.content || "hmm ...";
// }

function getAgentLoop(/*object: DRPObject,*/ questionSubmitted: boolean) {
	let isRunning = false;
	const aiPeerId = "ai-for-" + getNode().networkNode.peerId;
	return async () => {
		if (isRunning) return;
		try {
			isRunning = true;
			// const node = getNode();
			const chat = getChat();
			if (!chat) return;
			// const verticesCount = object.hashGraph.vertices.size;
			// const isOdd = verticesCount % 2 === 1;

			// if ((!isOdd && questionSubmitted) || (isOdd && !questionSubmitted)) return;
			if (chat.query_messages().size >= MAX_MESSAGES) return;
			if (!questionSubmitted) return;

			const waitTime = 2000 + Math.floor(Math.random() * 4000 + 1000);
			console.log(`waiting for ${waitTime} ...`);
			await new Promise((resolve) => setTimeout(resolve, waitTime));
			console.log(`waiting done.`);

			// Recheck conditions after delay
			if (!chat || chat.query_messages().size >= MAX_MESSAGES) return;

			const currentMessages = [...chat.query_messages()];

			// Check the last message's sender
			const { peerId } = currentMessages[currentMessages.length - 1];
			const isMyTurn = peerId !== aiPeerId;

			if (isMyTurn) {
				const aiResponse = await generateAIResponse(currentMessages.map((m) => m.content));
				const timestamp = Date.now().toString();
				console.log(`aiResponse "${aiResponse}"`);
				getChat().addMessage(timestamp, aiResponse, aiPeerId, Role.Assistant);
			}
			isRunning = false;
		} catch (error) {
			console.error("AI response generation failed:", error);
		} finally {
			isRunning = false;
		}
	};
}

function subscribeToChat(
	drp: DRPObject,
	questionSubmitted: boolean,
	messages: Message[],
	setMessages: (messages: Message[]) => void
) {
	// const agentLoop = getAgentLoop(drp, questionSubmitted);
	const agentLoop = getAgentLoop(questionSubmitted);
	let verticesCount = -1;
	console.log("subscribing to chat", drp.id);
	const node = getNode();
	node.objectStore.subscribe(drp.id, (_, object) => {
		const chat = object.drp as Chat;
		const tmpCount = object.hashGraph.vertices.size;
		const isOdd = tmpCount % 2 === 1;

		const chatMessages = Array.from(chat.query_messages());
		if (messages.length === chatMessages.length) {
			return;
		}
		setMessages(chatMessages);

		if (
			verticesCount !== tmpCount &&
			((isOdd && questionSubmitted) || (!isOdd && !questionSubmitted))
		) {
			agentLoop().catch((e) => console.error("agentLoop error", e));
			verticesCount = tmpCount;
		}
	});
}

export function useChat({ id, initialInput = "" }: UseChatOptions): UseChatHelpers {
	// console.log("useChat");
	// Messages state and handlers.
	const [messages, setMessages] = useState<Message[]>([]);

	// Input state and handlers.
	const [input, setInput] = useState(initialInput);

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>
	) => {
		setInput(e.target.value);
	};

	// Whether the question has been submitted
	const [questionSubmitted, setQuestionSubmitted] = useState(false);

	const [drpID, setDrpID] = useState<string | null>(null);

	const joinCreateAndAddMember = useCallback(
		async (id?: string) => {
			const peerID = getNode().networkNode.peerId;
			const randomIndex = Math.floor(Math.random() * animalEmojis.length);
			const emojiUnicode = animalEmojis[randomIndex];
			const result = await createOrJoinDRP(id);
			setDrpID(result.drp.id);
			subscribeToChat(result.drp, questionSubmitted, messages, setMessages);
			result.chat.addMember(peerID, emojiUnicode);
		},
		[questionSubmitted, messages, setMessages]
	);

	const createChat = useCallback(async () => {
		await joinCreateAndAddMember(id);
	}, [id, joinCreateAndAddMember]);

	const joinChat = useCallback(
		async (chatId: string) => {
			await joinCreateAndAddMember(chatId);
		},
		[joinCreateAndAddMember]
	);

	const handleSubmit = useCallback(() => {
		const now = Date.now().toString();
		const node = getNode();
		console.log(`handleSubmit "${input}"`);
		setMessages([
			...messages,
			{
				timestamp: now,
				content: input,
				peerId: node.networkNode.peerId,
				role: Role.User,
			},
		]);
		setQuestionSubmitted(true);
		if (drpID) {
			getChat().addMessage(now, input, node.networkNode.peerId, Role.User);
			const agentLoop = getAgentLoop(true);
			agentLoop().catch((e) => console.error("agentLoop error", e));
		}
	}, [messages, setMessages, input, drpID]);

	return {
		input,
		setInput,
		handleInputChange,
		handleSubmit,
		messages,
		id: drpID,
		questionSubmitted,
		createChat,
		joinChat,
	};
}
