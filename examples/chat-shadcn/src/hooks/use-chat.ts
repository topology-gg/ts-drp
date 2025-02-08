import { useCallback, useState } from "react";

import { Message } from "@/objects/chat";
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

	/** The id of the chat */
	id: string;
};

export function useChat({ id, initialInput = "" }: UseChatOptions): UseChatHelpers {
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

	const drpID = id ?? crypto.randomUUID();

	const handleSubmit = useCallback(() => {
		const now = Date.now().toString();
		appendMessage({
			timestamp: now,
			content: input,
			peerId: drpID,
		});
	}, [input, appendMessage, drpID]);

	return {
		input,
		setInput,
		handleInputChange,
		handleSubmit,
		messages,
		appendMessage,
		id: drpID,
	};
}
