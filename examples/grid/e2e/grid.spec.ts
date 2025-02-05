import { type Page, expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

const peersSelector = "#peers";
const peerIdSelector = "#peerIdExpanded";
const DRPIdInputSelector = "#gridInput";
const joinGridButtonSelector = "#joinGrid";
const objectPeersSelector = "#objectPeers";

function tailFileUntilTwoMatches(
	filePath: string,
	searchString: string,
	matchCount = 2
): Promise<void> {
	return new Promise((resolve, reject) => {
		let count = 0;
		let filePosition = 0;
		const intervalMs = 100;

		const interval = setInterval(() => {
			fs.stat(filePath, (err, stats) => {
				if (err) {
					clearInterval(interval);
					return reject(err);
				}

				if (stats.size > filePosition) {
					const stream = fs.createReadStream(filePath, {
						start: filePosition,
						end: stats.size,
						encoding: "utf8",
					});

					filePosition = stats.size;

					const rl = readline.createInterface({ input: stream });
					rl.on("line", (line) => {
						if (line.includes(searchString)) {
							count++;
							if (count === matchCount) {
								clearInterval(interval);
								rl.close();
								resolve();
							}
						}
					});
				}
			});
		}, intervalMs);
	});
}

async function clearLogFile() {
	const logPath = path.join(process.cwd(), "test.e2e.log");
	await fs.promises.writeFile(logPath, "");
}

async function getGlowingPeer(page: Page, peerID: string) {
	const div = page.locator(`div[data-glowing-peer-id="${peerID}"]`);
	const style = await div.getAttribute("style");
	if (!style) throw new Error("style is not defined");

	const matchPeerID = style.match(/glow-([a-zA-Z0-9]+)/);
	if (!matchPeerID) throw new Error("matchPeerID is not defined");

	const matchLeft = style.match(/left: ([0-9]+)px/);
	const matchTop = style.match(/top: ([0-9]+)px/);
	if (!matchLeft || !matchTop) throw new Error("matchLeft or matchTop is not defined");

	return {
		peerID: matchPeerID[1],
		left: Number.parseInt(matchLeft[1]),
		top: Number.parseInt(matchTop[1]),
	};
}

async function getPeerID(page: Page) {
	const peerID = await (
		await page.waitForSelector(peerIdSelector, {
			timeout: 10000,
			state: "attached",
		})
	).textContent();
	if (!peerID) throw new Error("peerID is not defined");
	return peerID.trim();
}

test.describe("grid", () => {
	let page1: Page;
	let page2: Page;

	test.beforeEach(async ({ browser }) => {
		const { promise, resolve } = Promise.withResolvers<boolean>();
		let hasGraftPage2 = false;
		let hasGraftPage1 = false;
		await clearLogFile();

		page1 = await browser.newPage();
		page1.on("console", async (msg) => {
			if (!page2) return;
			const peerID2 = await getPeerID(page2);
			if (msg.text().includes(`graft {peerId: ${peerID2}`)) {
				hasGraftPage1 = true;
			}
			if (hasGraftPage1 && hasGraftPage2) resolve(true);
		});

		await page1.goto("/");
		await page1.waitForSelector("#loadingMessage", { state: "hidden" });

		// wait for the peer to identify so the PX go well
		await tailFileUntilTwoMatches("test.e2e.log", "::start::peer::identify");

		page2 = await browser.newPage();
		page2.on("console", async (msg) => {
			if (!page1) return;
			const peerID1 = await getPeerID(page1);
			if (msg.text().includes(`graft {peerId: ${peerID1}`)) hasGraftPage2 = true;
			if (hasGraftPage1 && hasGraftPage2) resolve(true);
		});
		await page2.goto("/");
		await page2.waitForSelector("#loadingMessage", { state: "hidden" });
		await promise;
	});

	test("check peerID", async () => {
		await expect(page1).toHaveTitle(/DRP - Grid/);
		await expect(page2).toHaveTitle(/DRP - Grid/);

		await expect(page1.locator(peerIdSelector)).not.toBeEmpty({
			timeout: 10000,
		});
		await expect(page2.locator(peerIdSelector)).not.toBeEmpty({
			timeout: 10000,
		});

		const peerID1 = await getPeerID(page1);
		const peerID2 = await getPeerID(page2);

		await expect(page1.locator(peersSelector)).toContainText(peerID2, {
			timeout: 10000,
		});
		await expect(page2.locator(peersSelector)).toContainText(peerID1, {
			timeout: 10000,
		});
	});

	test("check peers are moving", async () => {
		const peerID1 = await getPeerID(page1);
		const peerID2 = await getPeerID(page2);

		const drpId = `test-drp-id-${Math.random().toString(36).substring(2, 15)}`;
		await page1.fill(DRPIdInputSelector, drpId);
		await page1.click(joinGridButtonSelector);
		await page2.fill(DRPIdInputSelector, drpId);
		await page2.click(joinGridButtonSelector);

		await expect(page1.locator(objectPeersSelector)).toContainText(peerID2, {
			timeout: 10000,
		});
		await expect(page2.locator(objectPeersSelector)).toContainText(peerID1, {
			timeout: 10000,
		});

		await page1.keyboard.press("w");
		await page2.keyboard.press("s");

		await expect(page1.locator(DRPIdInputSelector)).toHaveValue(drpId);
		await expect(page2.locator(DRPIdInputSelector)).toHaveValue(drpId);

		await expect(page2.locator(`div[data-glowing-peer-id="${peerID1}"]`)).toBeVisible({
			timeout: 10000,
		});
		await expect(page2.locator(`div[data-glowing-peer-id="${peerID2}"]`)).toBeVisible({
			timeout: 10000,
		});

		const glowingPeer1 = await getGlowingPeer(page1, peerID1);
		const glowingPeer2 = await getGlowingPeer(page1, peerID2);
		expect(Math.abs(glowingPeer1.top - glowingPeer2.top)).toBe(100);
	});
});
