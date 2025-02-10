import { CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getNode } from "@/lib/node";

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
						placeholder="Enter Chat ID"
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
				<Button variant="outline" onClick={onCreateChat} className="w-full">
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
					<span className="text-muted-foreground shrink-0">Node ID:</span>
					<div className="font-mono flex flex-col">
						<span key={node.networkNode.peerId} title={node.networkNode.peerId}>
							{`${node.networkNode.peerId.slice(0, 7)}..${node.networkNode.peerId.slice(-4)}`}
						</span>
					</div>
				</div>
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
	);
}
