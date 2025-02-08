export type UseChatOptions = {
	/**
	 * A unique identifier for the chat. If not provided a random one will be generated. When provided the DRPNode
	 * will try to connect to the existing object on the network.
	 */
	id?: string;

	/**
	 * The initial input for the chat.
	 */
	initialInput?: string;
};
