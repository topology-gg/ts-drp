import { DRPNode } from "@ts-drp/node";
import { DRPObject } from "@ts-drp/object";

import { Chat } from "@/objects/chat";

let node: DRPNode | null = null;
let chat: Chat | null = null;
let drp: DRPObject | null = null;

export const getNode = () => {
	if (!node) {
		node = new DRPNode({
			//network_config: {
			//	bootstrap_peers: [
			//		"/ip4/127.0.0.1/tcp/50000/ws/p2p/12D3KooWC6sm9iwmYbeQJCJipKTRghmABNz1wnpJANvSMabvecwJ",
			//	],
			//},
		});
		node.start().catch((e) => console.error("node start error", e));
	}
	return node;
};

export const getChat = () => {
	if (!chat) {
		throw new Error("Chat not initialized");
	}
	return chat;
};

export const getDrp = () => {
	if (!drp) {
		throw new Error("DRP not initialized");
	}
	return drp;
};

export async function createOrJoinDRP(id?: string): Promise<{ chat: Chat; drp: DRPObject }> {
	if (id) {
		return joinDRP(id);
	}
	return createDRP();
}

async function joinDRP(id: string) {
	const node = getNode();
	drp = await node.connectObject({ id, drp: new Chat() });
	chat = drp.drp as Chat;
	return { chat, drp };
}

async function createDRP(): Promise<{ chat: Chat; drp: DRPObject }> {
	const node = getNode();
	drp = await node.createObject({
		drp: new Chat(),
		sync: {
			enabled: true,
		},
	});
	chat = drp.drp as Chat;
	return { chat, drp };
}
