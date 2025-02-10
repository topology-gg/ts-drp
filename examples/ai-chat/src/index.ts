import { DRPNode } from '@ts-drp/node';
import type { DRPObject } from "@ts-drp/object";
import Groq from 'groq-sdk';
import { Chat } from "./objects/chat";
import { getColorForPeerId } from "./util/color";
import { systemPrompt } from './prompt';

const node = new DRPNode();
let drpObject: DRPObject;
let chatDRP: Chat;
let peers: string[] = [];
let discoveryPeers: string[] = [];
let objectPeers: string[] = [];

// Initialize Groq agent for this client
const groq = new Groq({
	apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
	dangerouslyAllowBrowser: true
});
let aiPeerId: string;
const MAX_MESSAGES = 500;
let isAgentTurn = false;

const formatPeerId = (id: string): string => {
	return `${id.slice(0, 4)}...${id.slice(-4)}`;
};

const stylizedPeerId = (id: string): string => {
	return `<strong style="color: ${getColorForPeerId(id)}">${formatPeerId(id)}</strong>`
};

async function generateAIResponse(messages: string[]): Promise<string> {
	const prompt = `
	${systemPrompt}

	----------

	Chat history: ${messages.join('\n')}
	`;

	// Models on Groq that support tool usage eg MCP
	// https://console.groq.com/docs/tool-use
	const completion = await groq.chat.completions.create({
		messages: [{ role: 'user', content: prompt }],
		model: 'llama-3.3-70b-versatile', //'llama-3.1-8b-instant', //'mixtral-8x7b-32768'
		temperature: 0.9,
		max_tokens: 200,
	});
	console.log('>>> prompting with', prompt);
	return completion.choices[0]?.message?.content || "hmm ...";
}

let questionAgent = false
// Modified sendMessage to only handle human messages
async function sendMessage(message: string) {
	questionAgent = true
	const timestamp: string = Date.now().toString();
	if (!chatDRP) {
		console.error("Chat DRP not initialized");
		alert("Please create or join a chat room first");
		return;
	}

	chatDRP.addMessage(timestamp, message, node.networkNode.peerId);
	render();

	// agentLoop();
}
let isRunning = false;
async function agentLoop(object: DRPObject) {
	if (isRunning) return;
	isRunning = true;
	const verticesCountTmp = object.hashGraph.vertices.size;
    const isOdd = verticesCountTmp % 2 === 1;
    if ((!isOdd && questionAgent) || (isOdd && !questionAgent)) {
        isRunning = false;
        return;
    }
	if (!chatDRP || chatDRP.query_messages().size >= MAX_MESSAGES) {
		isRunning = false;
		return;
	}

	const messages = [...chatDRP.query_messages()];
	if (messages.length === 0) {
		console.log('asd')
		isRunning = false;
		return;
	 } // Wait for initial human message

	// Wait 3 + rand(1000,5000)/1000 seconds before checking turn
	console.log('>>> waiting 2 + rand(1000,4000)/1000 seconds ...')
	await new Promise(resolve => setTimeout(resolve, 2000 + Math.floor(Math.random() * 4000 + 1000)));
	console.log('>>> waiting done ...')

	// Recheck conditions after delay
	if (!chatDRP || chatDRP.query_messages().size >= MAX_MESSAGES) return;

	const currentMessages = [...chatDRP.query_messages()];
	// console.log('>>>>>> currentMessages.length', currentMessages.length);

	// // Get all AI members and sort them to ensure consistent order
	// const aiMembers = [...chatDRP.getMembers()]
	// 	.filter(id => id.startsWith('ai-for-'))
	// 	.sort();
	// console.log('>>> aiMembers:', aiMembers);

	// Check the last message's sender
	const lastMessage = currentMessages[currentMessages.length - 1];
	const [, , lastSender] = lastMessage.slice(1, -1).split('//');
	const isMyTurn = lastSender !== aiPeerId;

	// console.log('>>> lastSender', lastSender);
	// console.log('>>> isMyTurn', isMyTurn);

	// const isMyTurn = true;
	if (isMyTurn) {
		try {
			const aiResponse = await generateAIResponse(
				currentMessages.map(m => {
					const [,message,] = m.slice(1, -1).split('//');
					return message;
				})
			);
			// const aiResponse = `${currentMessages.length}`
			// console.log(`len ${currentMessages.length}`)
			const timestamp = Date.now().toString();
			chatDRP.addMessage(timestamp, aiResponse, aiPeerId);
			console.log('>>> send message', aiResponse);
			render();
		} catch (error) {
			console.error('AI response generation failed:', error);
		}
	}
	isRunning = false
}

async function createConnectHandlers() {
	node.addCustomGroupMessageHandler(drpObject.id, () => {
		if (drpObject) {
			objectPeers = node.networkNode.getGroupPeers(drpObject.id);
		}
		render();
	});

	let verticesCount = -1;

	node.objectStore.subscribe(drpObject.id, async (_, object) => {
		const tmpCount = object.hashGraph.vertices.size;
		const isOdd = tmpCount % 2 === 1;

		render();
		console.log('verticesCount', verticesCount, 'tmpCount', tmpCount, 'isOdd', isOdd, 'questionAgent', questionAgent)
		if (
			verticesCount !== tmpCount &&
			((isOdd && questionAgent) || (!isOdd && !questionAgent))
		) {
			await agentLoop(object);
			verticesCount = tmpCount;
		}
	});
}

const render = () => {
	if (drpObject) (<HTMLButtonElement>document.getElementById("chatId")).innerText = drpObject.id;
	const element_peerId = <HTMLDivElement>document.getElementById("peerId");
	element_peerId.innerHTML = stylizedPeerId(node.networkNode.peerId);

	const element_peers = <HTMLDivElement>document.getElementById("peers");
	element_peers.innerHTML = `[${peers.map(p =>
		stylizedPeerId(p)
	).join(", ")}]`;

	// const element_discoveryPeers = <HTMLDivElement>document.getElementById("discoveryPeers");
	// element_discoveryPeers.innerHTML = `[${discoveryPeers.map(p =>
	// 	stylizedPeerId(p)
	// ).join(", ")}]`;

	const element_objectPeers = <HTMLDivElement>document.getElementById("objectPeers");
	element_objectPeers.innerHTML = `[${objectPeers.map(p =>
		stylizedPeerId(p)
	).join(", ")}]`;


	if (!chatDRP) return;
	const chat = chatDRP.query_messages();
	const element_chat = <HTMLDivElement>document.getElementById("chat");
	element_chat.innerHTML = "";

	if (chat.size === 0) {
		const div = document.createElement("div");
		div.innerHTML = "No messages yet";
		div.style.padding = "10px";
		element_chat.appendChild(div);
		return;
	}
	for (const message of [...chat].sort()) {
		const div = document.createElement("div");
		const [timestamp, content, senderId] = message.slice(1, -1).split('//');
		div.style.padding = "10px";
		div.style.color = '#CCCCCC';
		div.style.backgroundColor = getColorForPeerId(senderId.startsWith('ai-for-') ? senderId.slice(7) : senderId);
		// div.innerHTML = `(${timestamp}, ${content}, ${senderId})`;
		// div.innerHTML = `> (content='${content}', senderId='${senderId}')`;
		div.innerHTML = `> ${content}`;
		element_chat.appendChild(div);
	}
};

async function main() {
	await node.start();
	render();

	// get ai peer id
	aiPeerId = `ai-for-${node.networkNode.peerId}`;
	console.log('at node start(): aiPeerId', aiPeerId);

	// generic message handler
	node.addCustomGroupMessageHandler("", () => {
		peers = node.networkNode.getAllPeers();
		discoveryPeers = node.networkNode.getGroupPeers("drp::discovery");
		render();
	});

	const button_create = <HTMLButtonElement>document.getElementById("createRoom");
	button_create.addEventListener("click", async () => {
		drpObject = await node.createObject({ drp: new Chat() });
		chatDRP = drpObject.drp as Chat;
		chatDRP.addMember(aiPeerId);
		await createConnectHandlers();
		render();
	});

	const button_connect = <HTMLButtonElement>document.getElementById("joinRoom");
	button_connect.addEventListener("click", async () => {
		const input: HTMLInputElement = <HTMLInputElement>document.getElementById("roomInput");
		const objectId = input.value;
		if (!objectId) {
			alert("Please enter a room id");
			return;
		}

		drpObject = await node.createObject({ id: objectId, drp: new Chat() });
		chatDRP = drpObject.drp as Chat;
		chatDRP.addMember(aiPeerId);
		await createConnectHandlers();
		render();
	});

	const button_send = <HTMLButtonElement>document.getElementById("sendMessage");
	button_send.addEventListener("click", async () => {
		const input: HTMLInputElement = <HTMLInputElement>document.getElementById("messageInput");
		const message: string = input.value;
		input.value = "";
		if (!message) {
			console.error("Tried sending an empty message");
			alert("Please enter a message");
			return;
		}
		await sendMessage(message);
		const element_chat = <HTMLDivElement>document.getElementById("chat");
		element_chat.scrollTop = element_chat.scrollHeight;
	});
}

void main();
