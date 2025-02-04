import { DRPNode } from "@ts-drp/node";
import type { DRPObject } from "@ts-drp/object";

import { Grid } from "./objects/grid";
import { hslToRgb, rgbToHex, rgbToHsl } from "./util/color";

const networkConfig = getNetworkConfigFromEnv();
const node = new DRPNode(networkConfig ? { network_config: networkConfig } : undefined);

let drpObject: DRPObject;
let gridDRP: Grid;
let peers: string[] = [];
let discoveryPeers: string[] = [];
let objectPeers: string[] = [];

export function getNetworkConfigFromEnv() {
	const hasBootstrapPeers = Boolean(import.meta.env.VITE_BOOTSTRAP_PEERS);
	const hasDiscoveryInterval = Boolean(import.meta.env.VITE_DISCOVERY_INTERVAL);
	const hasPubsubPruneBackoff = Boolean(import.meta.env.VITE_PUBSUB_PRUNE_BACKOFF);
	const hasPubsubHeartbeatInterval = Boolean(import.meta.env.VITE_PUBSUB_HEARTBEAT_INTERVAL);

	const hasEnv =
		hasBootstrapPeers ||
		hasDiscoveryInterval ||
		hasPubsubPruneBackoff ||
		hasPubsubHeartbeatInterval;

	const config: Record<string, unknown> = {
		browser_metrics: true,
	};

	if (!hasEnv) {
		return config;
	}

	if (hasBootstrapPeers) {
		config.bootstrap_peers = import.meta.env.VITE_BOOTSTRAP_PEERS.split(",");
	}

	if (hasDiscoveryInterval) {
		config.pubsub_peer_discovery_interval = import.meta.env.VITE_DISCOVERY_INTERVAL;
	}

	if (hasPubsubPruneBackoff) {
		config.pubsub = {
			prune_backoff: import.meta.env.VITE_PUBSUB_PRUNE_BACKOFF,
		};
	}

	if (hasPubsubHeartbeatInterval) {
		config.pubsub = {
			...(config.pubsub || {}),
			heartbeat_interval: import.meta.env.VITE_PUBSUB_HEARTBEAT_INTERVAL,
		};
	}

	return config;
}

const formatPeerId = (id: string): string => {
	return `${id.slice(0, 4)}...${id.slice(-4)}`;
};

const colorMap: Map<string, string> = new Map();

const hashCode = (str: string): number => {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};

const getColorForPeerId = (id: string): string => {
	if (!colorMap.has(id)) {
		const hash = hashCode(id);
		let r = (hash & 0xff0000) >> 16;
		let g = (hash & 0x00ff00) >> 8;
		let b = hash & 0x0000ff;

		// Convert to HSL and adjust lightness to be below 50%
		// eslint-disable-next-line prefer-const
		let [h, s, l] = rgbToHsl(r, g, b);
		l = l * 0.5; // Set lightness to below 50%

		// Convert back to RGB
		[r, g, b] = hslToRgb(h, s, l);
		const color = rgbToHex(r, g, b); // Convert RGB to hex
		colorMap.set(id, color);
	}
	return colorMap.get(id) || "#000000";
};

const renderClickablePeerList = (
	peers: string[],
	isOpen: boolean,
	elementId: string,
	callback: () => void,
	defaultText = "[]"
) => {
	const element = <HTMLDivElement>document.getElementById(elementId);
	const hasPeers = peers.length > 0;
	if (!hasPeers) {
		element.innerHTML = defaultText;
		return;
	}

	element.innerHTML = `[${peers.map((peer) => `<strong style="color: ${getColorForPeerId(peer)};">${formatPeerId(peer)}</strong>`).join(", ")}]`;
	element.style.cursor = "pointer";

	const peersList = document.createElement("ul");
	peersList.style.display = "none";
	peersList.style.margin = "10px 0";
	peersList.style.paddingLeft = "20px";

	for (const peer of peers) {
		const li = document.createElement("li");
		li.innerHTML = `<strong style="color: ${getColorForPeerId(peer)};">${peer}</strong>`;
		peersList.appendChild(li);
	}

	element.appendChild(peersList);

	peersList.style.display = isOpen ? "block" : "none";
	element.onclick = () => {
		peersList.style.display = peersList.style.display === "none" ? "block" : "none";
		callback();
	};
};

let isDiscoveryPeersOpen = false;

const renderDiscoveryPeers = () => {
	discoveryPeers = node.networkNode.getGroupPeers("drp::discovery");

	renderClickablePeerList(discoveryPeers, isDiscoveryPeersOpen, "discoveryPeers", () => {
		isDiscoveryPeersOpen = !isDiscoveryPeersOpen;
	});
};

let isPeersOpen = false;

const renderPeers = () => {
	peers = node.networkNode.getAllPeers();

	renderClickablePeerList(peers, isPeersOpen, "peers", () => {
		isPeersOpen = !isPeersOpen;
	});
};

let isPeersInDRPOpen = false;

const renderPeersInDRP = () => {
	if (drpObject) objectPeers = node.networkNode.getGroupPeers(drpObject.id);

	renderClickablePeerList(
		objectPeers,
		isPeersInDRPOpen,
		"objectPeers",
		() => {
			isPeersInDRPOpen = !isPeersInDRPOpen;
		},
		"Your frens in GRID: []"
	);
};

let isPeerIdExpanded = false;

const renderPeerId = () => {
	const element_peerId = <HTMLDivElement>document.getElementById("peerId");

	const innerHtml = () => `
	<strong id="peerIdExpanded" 
			style="color: ${getColorForPeerId(node.networkNode.peerId)};
				   ${isPeerIdExpanded ? "" : "display: none;"}">
	  ${node.networkNode.peerId}
	</strong>
	<strong id="peerIdCollapsed" 
			style="color: ${getColorForPeerId(node.networkNode.peerId)};
				   ${!isPeerIdExpanded ? "" : "display: none;"}">
	  ${formatPeerId(node.networkNode.peerId)}
	</strong>`;

	element_peerId.style.cursor = "pointer";
	element_peerId.innerHTML = innerHtml();
	element_peerId.onclick = () => {
		isPeerIdExpanded = !isPeerIdExpanded;
		element_peerId.innerHTML = innerHtml();
	};
};

const render = () => {
	if (drpObject) {
		const gridIdTextElement = <HTMLSpanElement>document.getElementById("gridIdText");
		gridIdTextElement.innerText = `You're in GRID ID:`;
		const gridIdElement = <HTMLSpanElement>document.getElementById("gridId");
		gridIdElement.innerText = drpObject.id;
		const copyGridIdButton = document.getElementById("copyGridId");
		if (copyGridIdButton) {
			copyGridIdButton.style.display = "inline"; // Show the button
		}
	} else {
		const copyGridIdButton = document.getElementById("copyGridId");
		if (copyGridIdButton) {
			copyGridIdButton.style.display = "none"; // Hide the button
		}
	}

	renderPeerId();
	renderPeers();
	renderDiscoveryPeers();
	renderPeersInDRP();

	if (!gridDRP) return;
	const users = gridDRP.query_users();
	const element_grid = <HTMLDivElement>document.getElementById("grid");
	element_grid.innerHTML = "";

	const gridWidth = element_grid.clientWidth;
	const gridHeight = element_grid.clientHeight;
	const centerX = Math.floor(gridWidth / 2);
	const centerY = Math.floor(gridHeight / 2);

	// Draw grid lines
	const numLinesX = Math.floor(gridWidth / 50);
	const numLinesY = Math.floor(gridHeight / 50);

	for (let i = -numLinesX; i <= numLinesX; i++) {
		const line = document.createElement("div");
		line.style.position = "absolute";
		line.style.left = `${centerX + i * 50}px`;
		line.style.top = "0";
		line.style.width = "1px";
		line.style.height = "100%";
		line.style.backgroundColor = "lightgray";
		element_grid.appendChild(line);
	}

	for (let i = -numLinesY; i <= numLinesY; i++) {
		const line = document.createElement("div");
		line.style.position = "absolute";
		line.style.left = "0";
		line.style.top = `${centerY + i * 50}px`;
		line.style.width = "100%";
		line.style.height = "1px";
		line.style.backgroundColor = "lightgray";
		element_grid.appendChild(line);
	}

	for (const userColorString of users) {
		const [id, color] = userColorString.split(":");
		const position = gridDRP.query_userPosition(userColorString);

		if (position) {
			const div = document.createElement("div");
			div.style.position = "absolute";
			div.style.left = `${centerX + position.x * 50 + 5}px`; // Center the circle
			div.style.top = `${centerY - position.y * 50 + 5}px`; // Center the circle
			if (id === node.networkNode.peerId) {
				div.style.width = `${34}px`;
				div.style.height = `${34}px`;
			} else {
				div.style.width = `${34 + 6}px`;
				div.style.height = `${34 + 6}px`;
			}
			div.style.backgroundColor = color;
			div.style.borderRadius = "50%";
			div.style.transition = "background-color 1s ease-in-out";
			div.style.animation = `glow-${id} 0.5s infinite alternate`;

			// Add black border for the current user's circle
			if (id === node.networkNode.peerId) {
				div.style.border = "3px solid black";
			}

			div.setAttribute("data-glowing-peer-id", id);

			// Create dynamic keyframes for the glow effect
			const style = document.createElement("style");
			style.innerHTML = `
			@keyframes glow-${id} {
				0% {
					background-color: ${hexToRgba(color, 0.5)};
				}
				100% {
					background-color: ${hexToRgba(color, 1)};
				}
			}`;
			document.head.appendChild(style);

			element_grid.appendChild(div);
		}
	}
};

// Helper function to convert hex color to rgba
function hexToRgba(hex: string, alpha: number) {
	const bigint = Number.parseInt(hex.slice(1), 16);
	const r = (bigint >> 16) & 255;
	const g = (bigint >> 8) & 255;
	const b = bigint & 255;
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

async function addUser() {
	if (!gridDRP) {
		console.error("Grid DRP not initialized");
		alert("Please create or join a grid first");
		return;
	}

	gridDRP.addUser(node.networkNode.peerId, getColorForPeerId(node.networkNode.peerId));
	render();
}

function moveUser(direction: string) {
	if (!gridDRP) {
		console.error("Grid DRP not initialized");
		alert("Please create or join a grid first");
		return;
	}

	gridDRP.moveUser(node.networkNode.peerId, direction);
	render();
}

async function createConnectHandlers() {
	if (drpObject) objectPeers = node.networkNode.getGroupPeers(drpObject.id);

	node.addCustomGroupMessageHandler(drpObject.id, () => {
		if (drpObject) objectPeers = node.networkNode.getGroupPeers(drpObject.id);
		render();
	});

	node.objectStore.subscribe(drpObject.id, () => {
		render();
	});
}

async function enableInterface() {
	const loadingMessage = document.getElementById("loadingMessage");
	if (loadingMessage) {
		loadingMessage.style.display = "none";
	}

	const joinButton = <HTMLButtonElement>document.getElementById("joinGrid");
	const createButton = <HTMLButtonElement>document.getElementById("createGrid");
	const gridInput = <HTMLInputElement>document.getElementById("gridInput");
	const copyButton = <HTMLButtonElement>document.getElementById("copyGridId");

	joinButton.disabled = false;
	createButton.disabled = false;
	gridInput.disabled = false;
	copyButton.disabled = false;
}

function renderInfo() {
	renderPeerId();
	renderPeers();
	renderDiscoveryPeers();
	renderPeersInDRP();
}

async function run() {
	await enableInterface();

	renderInfo();

	const button_create = <HTMLButtonElement>document.getElementById("createGrid");
	button_create.addEventListener("click", async () => {
		drpObject = await node.createObject({ drp: new Grid() });
		gridDRP = drpObject.drp as Grid;
		await createConnectHandlers();
		await addUser();
		render();
	});

	const button_connect = <HTMLButtonElement>document.getElementById("joinGrid");
	button_connect.addEventListener("click", async () => {
		const drpId = (<HTMLInputElement>document.getElementById("gridInput")).value;
		try {
			drpObject = await node.connectObject({
				id: drpId,
				drp: new Grid(),
			});
			gridDRP = drpObject.drp as Grid;
			await createConnectHandlers();
			await addUser();
			render();
			console.log("Succeeded in connecting with DRP", drpId);
		} catch (e) {
			console.error("Error while connecting with DRP", drpId, e);
		}
	});

	document.addEventListener("keydown", async (event) => {
		if (event.key === "w") moveUser("U");
		if (event.key === "a") moveUser("L");
		if (event.key === "s") moveUser("D");
		if (event.key === "d") moveUser("R");
	});

	const copyButton = <HTMLButtonElement>document.getElementById("copyGridId");
	copyButton.addEventListener("click", () => {
		const gridIdText = (<HTMLSpanElement>document.getElementById("gridId")).innerText;
		navigator.clipboard
			.writeText(gridIdText)
			.then(() => {
				console.log("Grid DRP ID copied to clipboard");
			})
			.catch((err) => {
				console.error("Failed to copy: ", err);
			});
	});
}

async function main() {
	await node.start();
	await node.networkNode.isDialable(async () => {
		console.log("Started node", import.meta.env);
		await run();
	});

	setInterval(renderInfo, import.meta.env.VITE_RENDER_INFO_INTERVAL);
}

void main();
