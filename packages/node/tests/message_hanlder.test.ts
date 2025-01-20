import { AddWinsSet } from "@topology-foundation/blueprints/src/index.js";
import { NetworkPb } from "@topology-foundation/network/src/index.js";
import { DrpType } from "@topology-foundation/object/dist/src/index.js";
import {
	type DRP,
	DRPObject,
	type IACL,
} from "@topology-foundation/object/src/index.js";
import { beforeAll, describe, expect, test } from "vitest";
import {
	syncAcceptHandler,
	syncHandler,
	updateHandler,
} from "../src/handlers.js";
import { DRPNode } from "../src/index.js";

describe("Handle message correctly", () => {
	let node: DRPNode;
	let drpObject: DRPObject;
	const mockSender = "12D3KooWEtLcL6DZVTnDe5rkv7a9pg7FwQQAyJpJX1zWH1tgAAEs";

	beforeAll(async () => {
		node = new DRPNode();
		await node.start();

		drpObject = new DRPObject(
			"",
			new AddWinsSet<number>(),
			null as unknown as IACL & DRP,
		);
		await node.createObject(new AddWinsSet<number>(), drpObject.id);

		(drpObject.drp as AddWinsSet<number>).add(5);
		(drpObject.drp as AddWinsSet<number>).add(10);
	});

	test("should handle update message correctly", async () => {
		const message = NetworkPb.Message.create({
			sender: mockSender,
			type: NetworkPb.MessageType.MESSAGE_TYPE_UPDATE,
			data: NetworkPb.Update.encode(
				NetworkPb.Update.create({
					objectId: drpObject.id,
					vertices: drpObject.vertices,
				}),
			).finish(),
		});
		const success = await updateHandler(node, message.data, message.sender);
		expect(success).toBe(true);

		const vertices = node
			.getObject(drpObject.id)
			?.hashGraph.getAllVertices()
			.map((vertex) => {
				return vertex.operation;
			});
		expect(vertices).toStrictEqual([
			{ drpType: "", opType: "-1", value: null },
			{ opType: "add", value: [5], drpType: DrpType.Drp },
			{ opType: "add", value: [10], drpType: DrpType.Drp },
		]);
	});

	test("should handle sync message correctly", async () => {
		(drpObject.drp as AddWinsSet<number>).add(1);
		(drpObject.drp as AddWinsSet<number>).add(2);
		const message = NetworkPb.Message.create({
			sender: mockSender,
			type: NetworkPb.MessageType.MESSAGE_TYPE_SYNC,
			data: NetworkPb.Sync.encode(
				NetworkPb.Sync.create({
					objectId: drpObject.id,
					vertexHashes: drpObject.vertices.map((vertex) => vertex.hash),
				}),
			).finish(),
		});
		const success = await syncHandler(node, message.sender, message.data);
		expect(success).toBe(true);
		expect(node.getObject(drpObject.id)?.vertices.length).toBe(3);
		expect(drpObject.vertices.length).toBe(5);
	});

	test("should handle sync accept message correctly", async () => {
		const message = NetworkPb.Message.create({
			sender: mockSender,
			type: NetworkPb.MessageType.MESSAGE_TYPE_SYNC_ACCEPT,
			data: NetworkPb.SyncAccept.encode(
				NetworkPb.SyncAccept.create({
					objectId: drpObject.id,
					requested: drpObject.vertices.slice(3, 5),
					requesting: [],
					attestations: [],
				}),
			).finish(),
		});
		const success = await syncAcceptHandler(node, message.sender, message.data);
		expect(success).toBe(false);
		expect(node.getObject(drpObject.id)?.vertices.length).toBe(5);
		expect(drpObject.vertices.length).toBe(5);
	});
});
