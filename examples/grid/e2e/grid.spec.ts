import { type Page, expect, test } from "@playwright/test";

const peersSelector = "#peers";
const peerIdSelector = "#peerIdExpanded";
const DRPIdInputSelector = "#gridInput";
const joinGridButtonSelector = "#joinGrid";
const objectPeersSelector = "#objectPeers";

async function getGlowingPeer(page: Page, peerID: string) {
	const div = page.locator(`div[data-glowing-peer-id="${peerID}"]`);
	const style = await div.getAttribute("style");
	if (!style) throw new Error("style is not defined");

	const matchPeerID = style.match(/glow-([a-zA-Z0-9]+)/);
	if (!matchPeerID) throw new Error("matchPeerID is not defined");

	const matchLeft = style.match(/left: ([0-9]+)px/);
	const matchTop = style.match(/top: ([0-9]+)px/);
	if (!matchLeft || !matchTop)
		throw new Error("matchLeft or matchTop is not defined");

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
		page1 = await browser.newPage();
		page2 = await browser.newPage();

		await page1.goto("/");
		await page2.goto("/");
	});

	test.afterEach(async () => {
		await page1.close();
		await page2.close();
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

		await expect(page1.locator(DRPIdInputSelector)).toHaveValue(drpId);
		await expect(page2.locator(DRPIdInputSelector)).toHaveValue(drpId);

		await page1.keyboard.press("w");
		await page2.keyboard.press("s");

		await expect(
			page2.locator(`div[data-glowing-peer-id="${peerID1}"]`),
		).toBeVisible();
		await expect(
			page2.locator(`div[data-glowing-peer-id="${peerID2}"]`),
		).toBeVisible();

		const glowingPeer1 = await getGlowingPeer(page1, peerID1);
		const glowingPeer2 = await getGlowingPeer(page1, peerID2);
		console.log(glowingPeer1, glowingPeer2);
		expect(Math.abs(glowingPeer1.top - glowingPeer2.top)).toBe(100);
	});
});
