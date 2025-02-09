import { DRPNode } from "@ts-drp/node";
import { DRPObject } from "@ts-drp/object";
import React, { useCallback, useState } from "react";

import { Chat, Message, Role } from "@/objects/chat";
import { UseChatOptions } from "@/types";

export type UseChatHelpers = {
	/** Current messages in the chat */
	messages: Message[];
	/**
	 * Append a message to the chat
	 * @param message - The message to append
	 */
	appendMessage: (message: Message) => void;
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

	/** The peers the node is connected to */
	peers: string[];

	/** The peers in the chat */
	chatPeers: string[];

	/** handle create Chat */
	createChat: () => void;

	/** handle join Chat */
	joinChat: (id: string) => void;

	/** Whether the question has been submitted */
	questionSubmitted: boolean;

	/** The DRPNode instance */
	node: DRPNode;

	/** The DRPObject instance */
	drp: DRPObject | null;

	/** The chat instance */
	chat: Chat | null;

	/** The id of the chat */
	id: string | null;
};

function createOrJoinDRP(node: DRPNode, id?: string): Promise<{ chat: Chat; drp: DRPObject }> {
	if (id) {
		return joinDRP(node, id);
	}
	return createDRP(node);
}

async function joinDRP(node: DRPNode, id: string) {
	const chat = new Chat();
	const drp = await node.connectObject({ id, drp: chat });
	return { chat: drp.drp as Chat, drp };
}

async function createDRP(node: DRPNode): Promise<{ chat: Chat; drp: DRPObject }> {
	const chat = new Chat();
	const drp = await node.createObject({ drp: chat });
	return { chat: drp.drp as Chat, drp };
}

export function useChat({ id, initialInput = "", node }: UseChatOptions): UseChatHelpers {
	// Messages state and handlers.
	const [messages, setMessages] = useState<Message[]>([]);

	const appendMessage = useCallback(
		(message: Message) => {
			setMessages([...messages, message]);
		},
		[messages]
	);

	// Input state and handlers.
	const [input, setInput] = useState(initialInput);

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>
	) => {
		setInput(e.target.value);
	};

	// Whether the question has been submitted
	const [questionSubmitted, setQuestionSubmitted] = useState(false);

	const [chat, setChat] = useState<Chat | null>(null);
	const [drp, setDrp] = useState<DRPObject | null>(null);
	const [drpID, setDrpID] = useState<string | null>(null);

	const createChat = useCallback(async () => {
		const result = await createOrJoinDRP(node, id);
		setChat(result.chat);
		setDrp(result.drp);
		setDrpID(result.drp.id);
	}, [node, id]);

	const joinChat = useCallback(
		async (chatId: string) => {
			const result = await createOrJoinDRP(node, chatId);
			setChat(result.chat);
			setDrp(result.drp);
			setDrpID(result.drp.id);
		},
		[node]
	);

	const [peers, setPeers] = useState<string[]>([]);
	const [chatPeers, setChatPeers] = useState<string[]>([]);

	setInterval(() => {
		setPeers(node.networkNode.getAllPeers());
		if (drpID) {
			setChatPeers(node.networkNode.getGroupPeers(drpID));
		}
	}, 300);

	const handleSubmit = useCallback(() => {
		const now = Date.now().toString();
		appendMessage({
			timestamp: now,
			content: input,
			peerId: node.networkNode.peerId,
			role: Role.User,
		});
		setQuestionSubmitted(true);
	}, [input, appendMessage, node.networkNode.peerId]);

	return {
		node,
		input,
		setInput,
		handleInputChange,
		handleSubmit,
		messages,
		appendMessage,
		id: drpID,
		chat,
		drp,
		peers,
		chatPeers,
		questionSubmitted,
		createChat,
		joinChat,
	};
}
