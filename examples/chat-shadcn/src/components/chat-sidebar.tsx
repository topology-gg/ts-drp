import { CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getNode, getChat } from "@/lib/node";

interface ChatSidebarProps {
	id: string | null;
	onJoinChat: (id: string) => void;
	onCreateChat: () => void;
}

export function ChatSidebar({ id, onJoinChat, onCreateChat }: ChatSidebarProps) {
	const [chatPeers, setChatPeers] = useState<string[]>([]);
	const [peers, setPeers] = useState<string[]>([]);
	const [joinId, setJoinId] = useState("");

	const node = getNode();
	let chat;
	try {
		chat = getChat();
	} catch (error) {
		console.error("Error getting chat:", error);
		chat = null;
	}

	useEffect(() => {
		const intervalID = setInterval(() => {
			const node = getNode();
			const tmpPeers = node.networkNode.getAllPeers();
			if (tmpPeers.length !== peers.length && !tmpPeers.every((peer) => peers.includes(peer))) {
				setPeers(tmpPeers);
			}
			if (id) {
				const tmpChatPeers = node.networkNode.getGroupPeers(id);
				if (
					tmpChatPeers.length !== chatPeers.length &&
					!tmpChatPeers.every((peer) => chatPeers.includes(peer))
				) {
					setChatPeers(tmpChatPeers);
				}
			}
		}, 1000);
		return () => clearInterval(intervalID);
	}, [id, peers, chatPeers]);

	return (
		<div className="w-64 border-r bg-background p-4 flex flex-col gap-4">
			<div className="space-y-2">
				<div className="flex flex-col gap-2">
					<input
						type="text"
						placeholder="Room ID"
						className="w-full px-3 py-1 text-sm rounded-md border bg-background"
						value={joinId}
						onChange={(e) => setJoinId(e.target.value)}
					/>
					<Button
						variant="outline"
						size="sm"
						onClick={() => joinId && onJoinChat(joinId)}
						className="w-full"
					>
						Join room
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
				<Button variant="outline" onClick={onCreateChat} className="w-full">
					Create room
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
					<span className="text-muted-foreground shrink-0">My ID:</span>
					<div className="font-mono flex flex-col">
						<span key={node.networkNode.peerId} title={node.networkNode.peerId}>
							<strong>{`${node.networkNode.peerId.slice(0, 7)}..${node.networkNode.peerId.slice(-4)}`}</strong>
						</span>
					</div>
				</div>
				<div className="text-sm flex items-start gap-1">
					<span className="text-muted-foreground shrink-0">Peers:</span>
					<div className="font-mono flex flex-col">
						{peers.map((peer) => (
							<span key={peer} title={peer}>
								{`${peer.slice(0, 7)}..${peer.slice(-4)}`}
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
				{chat ? (
					<div className="text-sm flex items-start gap-1">
						{/* <span className="text-muted-foreground shrink-0"></span> */}
						<div className="font-mono flex flex-col items-center">
							<span style={{ fontSize: "5rem", marginTop: "50px" }}>
								{(() => {
									const members = getChat().getMembers();
									const memberInfo = Array.from(members).find(
										(member) => member.peerId === node.networkNode.peerId
									);
									return memberInfo
										? String.fromCodePoint(parseInt(memberInfo.emojiUnicode.replace("U+", ""), 16))
										: "❓";
								})()}
							</span>
						</div>
					</div>
				) : (
					<></>
				)}
			</div>
		</div>
	);
}
