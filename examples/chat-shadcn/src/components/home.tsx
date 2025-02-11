import { GitHubLogoIcon } from "@radix-ui/react-icons";
// import { CopyIcon, CornerDownLeft, RefreshCcw, Volume2 } from "lucide-react";
import { CornerDownLeft } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ChatSidebar } from "@/components/chat-sidebar";
import CodeDisplayBlock from "@/components/code-display-block";
import { Button } from "@/components/ui/button";
import {
	ChatBubble,
	// ChatBubbleAction,
	ChatBubbleAvatar,
	ChatBubbleMessage,
} from "@/components/ui/chat/chat-bubble";
import { ChatInput } from "@/components/ui/chat/chat-input";
import { ChatMessageList } from "@/components/ui/chat/chat-message-list";
import { useChat } from "@/hooks/use-chat";
import { getNode, getChat } from "@/lib/node";
import { Message, Role } from "@/objects/chat";

// const ChatAiIcons = [
// 	{
// 		icon: CopyIcon,
// 		label: "Copy",
// 	},
// 	{
// 		icon: RefreshCcw,
// 		label: "Refresh",
// 	},
// 	{
// 		icon: Volume2,
// 		label: "Volume",
// 	},
// ];

export default function Home() {
	const [isGenerating, setIsGenerating] = useState(false);
	const [_, setFirstMessage] = useState<Message | null>(null);
	const node = getNode();

	const {
		messages,
		input,
		handleInputChange,
		handleSubmit,
		createChat,
		joinChat,
		id,
		//isLoading, reload
	} = useChat({
		//onResponse(response) {
		//	if (response) {
		//		console.log(response);
		//		setIsGenerating(false);
		//	}
		//		},
		//		onError(error) {
		//			if (error) {
		//				setIsGenerating(false);
		//			}
		//		},
	});

	useEffect(() => {
		if (messages.length > 0) {
			setFirstMessage(messages[0]);
		}
	}, [messages]);

	const messagesRef = useRef<HTMLDivElement>(null);
	const formRef = useRef<HTMLFormElement>(null);

	useEffect(() => {
		if (messagesRef.current) {
			messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
		}
	}, [messages]);

	const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsGenerating(true);
		handleSubmit(e);
	};

	const onKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			//if (isGenerating || isLoading || !input) return;
			setIsGenerating(true);
			await onSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
		}
	};

	// const handleActionClick = async (action: string, messageIndex: number) => {
	// 	console.log("Action clicked:", action, "Message index:", messageIndex);
	// 	if (action === "Refresh") {
	// 		setIsGenerating(true);
	// 		try {
	// 			//await reload();
	// 		} catch (error) {
	// 			console.error("Error reloading:", error);
	// 		} finally {
	// 			setIsGenerating(false);
	// 		}
	// 	}

	// 	if (action === "Copy") {
	// 		const message = messages[messageIndex];
	// 		if (message && message.role === Role.Assistant) {
	// 			await navigator.clipboard.writeText(message.content);
	// 		}
	// 	}
	// };

	let myAvatar = "?";
	let chat;
	try {
		chat = getChat();
	} catch (error) {
		console.error("Error getting chat:", error);
		chat = null;
	}
	if (chat) {
		const members = chat.getMembers();
		const memberInfo = Array.from(members).find(
			(member) => member.peerId === node.networkNode.peerId
		);
		if (memberInfo) {
			myAvatar = String.fromCodePoint(parseInt(memberInfo.emojiUnicode.replace("U+", ""), 16));
		}
	}

	return (
		<main className="flex h-screen w-full">
			<ChatSidebar id={id} onJoinChat={joinChat} onCreateChat={createChat} />

			{/* Main Chat Area */}
			<div className="flex-1 flex flex-col max-w-3xl mx-auto px-4">
				<div className="flex-1 w-full overflow-y-auto py-6 px-0">
					<ChatMessageList>
						{/* Initial Message */}
						{messages.length === 0 && (
							<div className="w-full bg-background shadow-sm border rounded-lg p-8 flex flex-col gap-2">
								<h2 className="font-bold">AI-DRP v1</h2>
								<p className="text-muted-foreground text-sm">
									{/* aa{" "} */}
									<a
										href="https://github.com/drp-tech/ts-drp"
										className="font-bold inline-flex flex-1 justify-center gap-1 leading-4 hover:underline"
									>
										ts-drp
										<svg
											aria-hidden="true"
											height="7"
											viewBox="0 0 6 6"
											width="7"
											className="opacity-70"
										>
											<path
												d="M1.25215 5.54731L0.622742 4.9179L3.78169 1.75597H1.3834L1.38936 0.890915H5.27615V4.78069H4.40513L4.41109 2.38538L1.25215 5.54731Z"
												fill="currentColor"
											></path>
										</svg>
									</a>{" "}
									object.
								</p>
							</div>
						)}

						{/* Messages */}
						{messages &&
							messages.map((message, index) => {
								const isFirstMessage = index === 0;
								let avatar = "?";

								// Get the chat object and members
								const chat = getChat();
								const members = chat.getMembers();
								console.log("message.peerId", message.peerId, "members", members);

								// If first message => use human emoji
								// If message.peerId starts with ai-for- => use animal emoji
								if (isFirstMessage) {
									avatar = "👨🏽";
								} else if (message.peerId.startsWith("ai-for-")) {
									const originalPeerId = message.peerId.substring("ai-for-".length);
									const memberInfo = Array.from(members).find(
										(member) => member.peerId === originalPeerId
									);
									if (memberInfo) {
										avatar = String.fromCodePoint(
											parseInt(memberInfo.emojiUnicode.replace("U+", ""), 16)
										);
									}
								}

								// // Find the member info for the current message's sender
								// const memberInfo = Array.from(members).find(
								// 	(member) => member.peerId === message.peerId
								// );
								// if (memberInfo) {
								// 	avatar = String.fromCodePoint(
								// 		parseInt(memberInfo.emojiUnicode.replace("U+", ""), 16)
								// 	);
								// } else if (isFirstMessage) {
								// 	avatar = "👨🏽";
								// } else if (firstMessage?.peerId === message.peerId) {
								// 	avatar = "🐶";
								// }

								return (
									<ChatBubble
										key={index}
										variant={message.role === Role.User ? "sent" : "received"}
									>
										<ChatBubbleAvatar src="" fallback={avatar} />
										<ChatBubbleMessage>
											{message.content.split("```").map((part: string, index: number) => {
												if (index % 2 === 0) {
													return (
														<Markdown key={index} remarkPlugins={[remarkGfm]}>
															{part}
														</Markdown>
													);
												} else {
													return (
														<pre className="whitespace-pre-wrap pt-2" key={index}>
															<CodeDisplayBlock code={part} lang="" />
														</pre>
													);
												}
											})}

											{/* {message.role === Role.Assistant && messages.length - 1 === index && (
												<div className="flex items-center mt-1.5 gap-1">
													{!isGenerating && (
														<>
															{ChatAiIcons.map((icon, iconIndex) => {
																const Icon = icon.icon;
																return (
																	<ChatBubbleAction
																		variant="outline"
																		className="size-5"
																		key={iconIndex}
																		icon={<Icon className="size-3" />}
																		onClick={() => handleActionClick(icon.label, index)}
																	/>
																);
															})}
														</>
													)}
												</div>
											)} */}
										</ChatBubbleMessage>
									</ChatBubble>
								);
							})}

						{/* Loading */}
						{isGenerating && (
							<ChatBubble variant="received">
								<ChatBubbleAvatar
									src=""
									fallback={myAvatar}
									// fallback={firstMessage?.peerId === node.networkNode.peerId ? "🐶" : "🐱"}
								/>
								<ChatBubbleMessage isLoading />
							</ChatBubble>
						)}
					</ChatMessageList>
				</div>

				{/* Form and Footer fixed at the bottom */}
				<div className="w-full pb-4">
					<form
						ref={formRef}
						onSubmit={onSubmit}
						className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring"
					>
						<ChatInput
							value={input}
							onKeyDown={onKeyDown}
							onChange={handleInputChange}
							placeholder="Type your message here..."
							className="rounded-lg bg-background border-0 shadow-none focus-visible:ring-0"
						/>
						<div className="flex items-center p-3 pt-0">
							<Button
								disabled={
									!input
									//|| isLoading
								}
								type="submit"
								size="sm"
								className="ml-auto gap-1.5"
							>
								Send Message
								<CornerDownLeft className="size-3.5" />
							</Button>
						</div>
					</form>
					<div className="pt-4 flex gap-2 items-center justify-center">
						<GitHubLogoIcon className="size-4" />
						<p className="text-xs">
							<a
								href="https://github.com/drp-tech/ts-drp"
								className="font-bold inline-flex flex-1 justify-center gap-1 leading-4 hover:underline"
							>
								ts-drp
								<svg
									aria-hidden="true"
									height="7"
									viewBox="0 0 6 6"
									width="7"
									className="opacity-70"
								>
									<path
										d="M1.25215 5.54731L0.622742 4.9179L3.78169 1.75597H1.3834L1.38936 0.890915H5.27615V4.78069H4.40513L4.41109 2.38538L1.25215 5.54731Z"
										fill="currentColor"
									></path>
								</svg>
							</a>
						</p>
					</div>
				</div>

				{/* <div className="text-sm flex items-start gap-1">
					<span className="text-muted-foreground shrink-0">My Emoji:</span>
					<div className="font-mono flex flex-col">
						{(() => {
							const members = getChat().getMembers();
							const memberInfo = Array.from(members).find(
								(member) => member.peerId === node.networkNode.peerId
							);
							return memberInfo
								? String.fromCodePoint(parseInt(memberInfo.emojiUnicode.replace("U+", ""), 16))
								: "❓";
						})()}
					</div>
				</div> */}
			</div>
		</main>
	);
}
