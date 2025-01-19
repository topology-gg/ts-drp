import { DRPNode } from "@ts-drp/node";
import type { DRPObject } from "@ts-drp/object";
import { Grid } from "./objects/grid";
import { hslToRgb, rgbToHex, rgbToHsl } from "./util/color";

const node = new DRPNode({
	network_config: {
		bootstrap_peers: [
			"/ip4/127.0.0.1/tcp/50000/ws/p2p/12D3KooWC6sm9iwmYbeQJCJipKTRghmABNz1wnpJANvSMabvecwJ",
		],
		browser_metrics: true,
	},
});
let drpObject: DRPObject;
let gridDRP: Grid;

const userElements: Map<string, HTMLDivElement> = new Map();

const createButton = <HTMLButtonElement>document.getElementById("createGrid");
const joinButton = <HTMLButtonElement>document.getElementById("joinGrid");
const drpIdInput = <HTMLInputElement>document.getElementById("gridInput");
const copyButton = <HTMLButtonElement>document.getElementById("copyGridId");
const gridIdElement = <HTMLSpanElement>document.getElementById("gridId");
const gridElement = <HTMLDivElement>document.getElementById("grid");
const peerIdElement = <HTMLDivElement>document.getElementById("peerId");
const peersElement = <HTMLDivElement>document.getElementById("peers");
const discoveryPeersElement = <HTMLDivElement>(
	document.getElementById("discoveryPeers")
);
const objectPeersElement = <HTMLDivElement>(
	document.getElementById("objectPeers")
);

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
		let [h, s, l] = rgbToHsl(r, g, b);
		l = l * 0.5; // Set lightness to below 50%

		// Convert back to RGB
		[r, g, b] = hslToRgb(h, s, l);
		const color = rgbToHex(r, g, b); // Convert RGB to hex
		colorMap.set(id, color);
	}
	return colorMap.get(id) || "#000000";
};

// Helper function to convert hex color to rgba
function hexToRgba(hex: string, alpha: number) {
	const bigint = Number.parseInt(hex.slice(1), 16);
	const r = (bigint >> 16) & 255;
	const g = (bigint >> 8) & 255;
	const b = bigint & 255;
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getGridCenters() {
	const gridWidth = gridElement.clientWidth;
	const gridHeight = gridElement.clientHeight;
	const centerX = Math.floor(gridWidth / 2);
	const centerY = Math.floor(gridHeight / 2);
	return { centerX, centerY };
}

function renderGrid() {
	const { centerX, centerY } = getGridCenters();
	const gridWidth = gridElement.clientWidth;
	const gridHeight = gridElement.clientHeight;
	gridElement.innerHTML = "";

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
		gridElement.appendChild(line);
	}

	for (let i = -numLinesY; i <= numLinesY; i++) {
		const line = document.createElement("div");
		line.style.position = "absolute";
		line.style.left = "0";
		line.style.top = `${centerY + i * 50}px`;
		line.style.width = "100%";
		line.style.height = "1px";
		line.style.backgroundColor = "lightgray";
		gridElement.appendChild(line);
	}

	for (const div of userElements.values()) {
		gridElement.appendChild(div);
	}
}

const renderGridId = () => {
	gridIdElement.innerText = drpObject
		? `You're in GRID ID: ${drpObject.id}`
		: "";
	copyButton.style.display = drpObject ? "inline" : "none";
};

const renderUsers = () => {
	if (!gridDRP) return;

	const users = gridDRP.query_users();
	const { centerX, centerY } = getGridCenters();

	for (const userColorString of users) {
		const [id, color] = userColorString.split(":");
		const position = gridDRP.query_userPosition(userColorString);

		if (!position) continue;

		let userDiv = userElements.get(id);

		if (!userDiv) {
			const isSelf = id === node.networkNode.peerId;
			userDiv = document.createElement("div");
			userDiv.style.position = "absolute";
			userDiv.style.width = `${isSelf ? 34 : 40}px`;
			userDiv.style.height = `${isSelf ? 34 : 40}px`;
			userDiv.style.backgroundColor = color;
			userDiv.style.borderRadius = "50%";
			userDiv.style.border = isSelf ? "3px solid black" : "none";
			userDiv.style.animation = `glow-${id} 0.5s infinite alternate`;

			const styleId = `glow-${id}`;
			if (!document.getElementById(styleId)) {
				const style = document.createElement("style");
				style.id = styleId;
				style.innerHTML = `@keyframes glow-${id} {
					0% { background-color: ${hexToRgba(color, 0.5)}; }
					100% { background-color: ${hexToRgba(color, 1)}; }
				}`;
				document.head.appendChild(style);
			}
			gridElement.appendChild(userDiv);
			userElements.set(id, userDiv);
		}

		userDiv.style.left = `${centerX + position.x * 50 + 5}px`;
		userDiv.style.top = `${centerY - position.y * 50 + 5}px`;
	}

	// Remove users no longer in the grid
	for (const [id, div] of userElements.entries()) {
		if (!users.some((user) => user.startsWith(id))) {
			div.remove();
			userElements.delete(id);
		}
	}
};

async function addUser() {
	if (!gridDRP) {
		console.error("Grid DRP not initialized");
		alert("Please create or join a grid first");
		return;
	}

	gridDRP.addUser(
		node.networkNode.peerId,
		getColorForPeerId(node.networkNode.peerId),
	);
}

async function moveUser(direction: string) {
	if (!gridDRP) {
		console.error("Grid DRP not initialized");
		alert("Please create or join a grid first");
		return;
	}
	gridDRP.moveUser(node.networkNode.peerId, direction);
}

async function createConnectHandlers() {
	node.objectStore.subscribe(drpObject.id, () => {
		renderUsers();
	});
}

function removeUsers() {
	for (const [id, div] of userElements.entries()) {
		div.remove();
		userElements.delete(id);
	}
}

async function createButtonHandler() {
	removeUsers();
	drpObject = await node.createObject(new Grid());
	gridDRP = drpObject.drp as Grid;
	createConnectHandlers();
	await addUser();
	renderGridId();
	renderGrid();
	renderUsers();
}

async function joinButtonHandler() {
	try {
		removeUsers();
		drpObject = await node.createObject(
			new Grid(),
			drpIdInput.value,
			undefined,
			true,
		);
		gridDRP = drpObject.drp as Grid;
		createConnectHandlers();
		await addUser();
		renderObjectPeers();
		renderGridId();
		renderGrid();
		renderUsers();
		console.log("Succeeded in connecting with DRP", drpIdInput.value);
	} catch (e) {
		console.error("Error while connecting with DRP", drpIdInput.value, e);
	}
}

function renderPeers() {
	const peers = node.networkNode.getAllPeers();
	peersElement.innerHTML = `[${peers.map((peer) => `<strong style="color: ${getColorForPeerId(peer)};">${formatPeerId(peer)}</strong>`).join(", ")}]`;
}

function renderDiscoveryPeers() {
	const discoveryPeers = node.networkNode.getGroupPeers("drp::discovery");
	discoveryPeersElement.innerHTML = `[${discoveryPeers.map((peer) => `<strong style="color: ${getColorForPeerId(peer)};">${formatPeerId(peer)}</strong>`).join(", ")}]`;
}

function renderObjectPeers() {
	if (!drpObject) return;
	const objectPeers = node.networkNode.getGroupPeers(drpObject.id);
	objectPeersElement.innerHTML = !gridDRP
		? ""
		: `Your frens in GRID: [${objectPeers.map((peer) => `<strong style="color: ${getColorForPeerId(peer)};">${formatPeerId(peer)}</strong>`).join(", ")}]`;
}

function handleKeyDown(event: KeyboardEvent) {
	const directionMap: Record<string, string> = {
		w: "U",
		a: "L",
		s: "D",
		d: "R",
	};
	if (directionMap[event.key]) moveUser(directionMap[event.key]);
	renderUsers();
}

async function main() {
	await node.start();
	peerIdElement.innerHTML = `<strong style="color: ${getColorForPeerId(node.networkNode.peerId)};">${formatPeerId(node.networkNode.peerId)}</strong>`;

	// libp2p Event Listeners
	node.addNodeEventListener("peer:connect", renderPeers);
	// since the Bootstrap dial happen during the start() function we have to render the peers at least once after the init
	renderPeers();
	node.addNodeEventListener("peer:disconnect", renderPeers);
	node.addPubsubEventListener("subscription-change", () => {
		renderDiscoveryPeers();
		renderObjectPeers();
	});

	// DOM event listeners
	createButton.addEventListener("click", createButtonHandler);
	joinButton.addEventListener("click", joinButtonHandler);
	document.addEventListener("keydown", handleKeyDown);
	copyButton.addEventListener("click", () =>
		navigator.clipboard.writeText(drpObject?.id || ""),
	);
	window.addEventListener("resize", () => {
		renderGrid();
		renderUsers();
	});
}

main();
