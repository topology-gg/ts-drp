import { DRPNode } from "@ts-drp/node";
import type { DRPObject } from "@ts-drp/object";
import { Grid } from "./objects/grid";
import { hslToRgb, rgbToHex, rgbToHsl } from "./util/color";

const node = new DRPNode();
let drpObject: DRPObject;
let gridDRP: Grid;
let peers: string[] = [];
let discoveryPeers: string[] = [];
let objectPeers: string[] = [];

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

const render = () => {
	if (drpObject) {
		const gridIdTextElement = <HTMLSpanElement>(
			document.getElementById("gridIdText")
		);
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

	const element_peerId = <HTMLDivElement>document.getElementById("peerId");
	element_peerId.innerHTML = `<strong style="color: ${getColorForPeerId(node.networkNode.peerId)};">${formatPeerId(node.networkNode.peerId)}</strong>`;

	const element_peers = <HTMLDivElement>document.getElementById("peers");
	element_peers.innerHTML = `[${peers.map((peer) => `<strong style="color: ${getColorForPeerId(peer)};">${formatPeerId(peer)}</strong>`).join(", ")}]`;

	const element_discoveryPeers = <HTMLDivElement>(
		document.getElementById("discoveryPeers")
	);
	element_discoveryPeers.innerHTML = `[${discoveryPeers.map((peer) => `<strong style="color: ${getColorForPeerId(peer)};">${formatPeerId(peer)}</strong>`).join(", ")}]`;

	const element_objectPeers = <HTMLDivElement>(
		document.getElementById("objectPeers")
	);
	element_objectPeers.innerHTML = !gridDRP
		? ""
		: `Your frens in GRID: [${objectPeers.map((peer) => `<strong style="color: ${getColorForPeerId(peer)};">${formatPeerId(peer)}</strong>`).join(", ")}]`;

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

	gridDRP.addUser(
		node.networkNode.peerId,
		getColorForPeerId(node.networkNode.peerId),
	);
	render();
}

async function moveUser(direction: string) {
	if (!gridDRP) {
		console.error("Grid DRP not initialized");
		alert("Please create or join a grid first");
		return;
	}

	gridDRP.moveUser(node.networkNode.peerId, direction);
	render();
}

async function createConnectHandlers() {
	node.addCustomGroupMessageHandler(drpObject.id, (e) => {
		if (drpObject) objectPeers = node.networkNode.getGroupPeers(drpObject.id);
		render();
	});

	node.objectStore.subscribe(drpObject.id, (_, obj) => {
		render();
	});
}

async function main() {
	await node.start();
	render();

	node.addCustomGroupMessageHandler("", (e) => {
		peers = node.networkNode.getAllPeers();
		discoveryPeers = node.networkNode.getGroupPeers("drp::discovery");
		render();
	});

	const button_create = <HTMLButtonElement>(
		document.getElementById("createGrid")
	);
	button_create.addEventListener("click", async () => {
		drpObject = await node.createObject(new Grid());
		gridDRP = drpObject.drp as Grid;
		createConnectHandlers();
		await addUser();
		render();
	});

	const button_connect = <HTMLButtonElement>document.getElementById("joinGrid");
	button_connect.addEventListener("click", async () => {
		const drpId = (<HTMLInputElement>document.getElementById("gridInput"))
			.value;
		try {
			drpObject = await node.createObject(new Grid(), drpId, undefined, true);
			gridDRP = drpObject.drp as Grid;
			createConnectHandlers();
			await addUser();
			render();
			console.log("Succeeded in connecting with DRP", drpId);
		} catch (e) {
			console.error("Error while connecting with DRP", drpId, e);
		}
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "w") moveUser("U");
		if (event.key === "a") moveUser("L");
		if (event.key === "s") moveUser("D");
		if (event.key === "d") moveUser("R");
	});

	const copyButton = <HTMLButtonElement>document.getElementById("copyGridId");
	copyButton.addEventListener("click", () => {
		const gridIdText = (<HTMLSpanElement>document.getElementById("gridId"))
			.innerText;
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

main();
