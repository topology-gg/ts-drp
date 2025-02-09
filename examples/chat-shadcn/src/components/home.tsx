import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { DRPNode } from "@ts-drp/node";
import { CopyIcon, CornerDownLeft, RefreshCcw, Volume2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import CodeDisplayBlock from "@/components/code-display-block";
import { Button } from "@/components/ui/button";
import {
	ChatBubble,
	ChatBubbleAction,
	ChatBubbleAvatar,
	ChatBubbleMessage,
} from "@/components/ui/chat/chat-bubble";
import { ChatInput } from "@/components/ui/chat/chat-input";
import { ChatMessageList } from "@/components/ui/chat/chat-message-list";
import { useChat } from "@/hooks/use-chat";
import { Message, Role } from "@/objects/chat";

const ChatAiIcons = [
	{
		icon: CopyIcon,
		label: "Copy",
	},
	{
		icon: RefreshCcw,
		label: "Refresh",
	},
	{
		icon: Volume2,
		label: "Volume",
	},
];

export default function Home({ node }: { node: DRPNode }) {
	const [isGenerating, setIsGenerating] = useState(false);
	const [firstMessage, setFirstMessage] = useState<Message | null>(null);
	const [joinId, setJoinId] = useState("");

	const {
		messages,
		input,
		handleInputChange,
		handleSubmit,
		createChat,
		joinChat,
		id,
		peers,
		chatPeers,
		//isLoading, reload
	} = useChat({
		node,
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

	const handleActionClick = async (action: string, messageIndex: number) => {
		console.log("Action clicked:", action, "Message index:", messageIndex);
		if (action === "Refresh") {
			setIsGenerating(true);
			try {
				//await reload();
			} catch (error) {
				console.error("Error reloading:", error);
			} finally {
				setIsGenerating(false);
			}
		}

		if (action === "Copy") {
			const message = messages[messageIndex];
			if (message && message.role === Role.Assistant) {
				await navigator.clipboard.writeText(message.content);
			}
		}
	};

	return (
		<main className="flex h-screen w-full">
			{/* Left Column */}
			<div className="w-64 border-r bg-background p-4 flex flex-col gap-4">
				<div className="space-y-2">
					<div className="flex flex-col gap-2">
						<input
							type="text"
							placeholder="Enter Chat ID"
							className="w-full px-3 py-1 text-sm rounded-md border bg-background"
							value={joinId}
							onChange={(e) => setJoinId(e.target.value)}
						/>
						<Button
							variant="outline"
							size="sm"
							onClick={() => joinId && joinChat(joinId)}
							className="w-full"
						>
							Join chat
						</Button>
					</div>
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-background px-2 text-muted-foreground">or</span>
						</div>
					</div>
					<Button variant="outline" onClick={createChat} className="w-full">
						Create new chat
					</Button>
				</div>

				<div className="space-y-2">
					<div className="text-sm flex items-center gap-1">
						<span className="text-muted-foreground shrink-0">Chat ID:</span>
						<span className="font-mono" title={id || ""}>
							{id ? `${id.slice(0, 7)}..${id.slice(-4)}` : ""}
						</span>
					</div>
					<Button
						variant="outline"
						size="sm"
						className="w-full text-xs"
						onClick={() => id && navigator.clipboard.writeText(id)}
					>
						<CopyIcon className="h-3 w-3 mr-1" />
						Copy ID
					</Button>
					<div className="text-sm flex items-start gap-1">
						<span className="text-muted-foreground shrink-0">Peers:</span>
						<div className="font-mono flex flex-col">
							{peers.map((peer) => (
								<span key={peer} title={peer}>
									{`${peer.slice(0, 8)}..${peer.slice(-4)}`}
								</span>
							))}
						</div>
					</div>
					<div className="text-sm flex items-start gap-1">
						<span className="text-muted-foreground shrink-0">Chat Peers:</span>
						<div className="font-mono flex flex-col">
							{chatPeers.map((peer) => (
								<span key={peer} title={peer}>
									{`${peer.slice(0, 4)}..${peer.slice(-4)}`}
								</span>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Main Chat Area */}
			<div className="flex-1 flex flex-col max-w-3xl mx-auto px-4">
				<div className="flex-1 w-full overflow-y-auto py-6 px-0">
					<ChatMessageList>
						{/* Initial Message */}
						{messages.length === 0 && (
							<div className="w-full bg-background shadow-sm border rounded-lg p-8 flex flex-col gap-2">
								<h2 className="font-bold">Welcome to this example DRP Chat application.</h2>
								<p className="text-muted-foreground text-sm">
									This is a simple DRP AI example application{" "}
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
								let avatar = "🐱";
								if (isFirstMessage) {
									avatar = "👨🏽";
								} else if (firstMessage?.peerId === message.peerId) {
									avatar = "🐕";
								}
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

											{message.role === Role.Assistant && messages.length - 1 === index && (
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
											)}
										</ChatBubbleMessage>
									</ChatBubble>
								);
							})}

						{/* Loading */}
						{isGenerating && (
							<ChatBubble variant="received">
								<ChatBubbleAvatar
									src=""
									fallback={firstMessage?.peerId === node.networkNode.peerId ? "🐕" : "🐱"}
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
			</div>
		</main>
	);
}
