import { SetDRP } from "@ts-drp/blueprints";
import { NetworkPb } from "@ts-drp/network";
import { DrpType } from "@ts-drp/object";
import { DRPObject, ObjectACL } from "@ts-drp/object";
import { beforeAll, describe, expect, test } from "vitest";

import {
	attestationUpdateHandler,
	signGeneratedVertices,
	syncAcceptHandler,
	syncHandler,
	updateHandler,
} from "../src/handlers.js";
import { DRPNode } from "../src/index.js";

describe("Handle message correctly", () => {
	let node: DRPNode;
	let node2: DRPNode;
	let drpObject: DRPObject;
	const mockSender = "12D3KooWEtLcL6DZVTnDe5rkv7a9pg7FwQQAyJpJX1zWH1tgAAEs";

	beforeAll(async () => {
		node = new DRPNode();
		node2 = new DRPNode();
		await node.start();
		await node2.start();

		const acl = new ObjectACL({
			admins: new Map([
				[node.networkNode.peerId, node.credentialStore.getPublicCredential()],
				[node2.networkNode.peerId, node2.credentialStore.getPublicCredential()],
			]),
		});

		drpObject = new DRPObject({
			peerId: node2.networkNode.peerId,
			drp: new SetDRP<number>(),
			acl,
		});
		await node.createObject({
			drp: new SetDRP<number>(),
			id: drpObject.id,
			acl: acl,
		});

		(drpObject.drp as SetDRP<number>).add(5);
		(drpObject.drp as SetDRP<number>).add(10);
	});

	test("should handle update message correctly", async () => {
		const vertices = drpObject.vertices;
		await signGeneratedVertices(node2, vertices);
		const message = NetworkPb.Message.create({
			sender: mockSender,
			type: NetworkPb.MessageType.MESSAGE_TYPE_UPDATE,
			data: NetworkPb.Update.encode(
				NetworkPb.Update.create({
					objectId: drpObject.id,
					vertices: vertices,
				})
			).finish(),
		});
		const success = await updateHandler(node, message.sender, message.data);
		expect(success).toBe(true);

		const expected_vertices = node
			.getObject(drpObject.id)
			?.hashGraph.getAllVertices()
			.map((vertex) => {
				return vertex.operation;
			});
		expect(expected_vertices).toStrictEqual([
			{ drpType: "", opType: "-1", value: null },
			{ opType: "add", value: [5], drpType: DrpType.DRP },
			{ opType: "add", value: [10], drpType: DrpType.DRP },
		]);
	});

	test("should handle sync message correctly", async () => {
		(drpObject.drp as SetDRP<number>).add(1);
		(drpObject.drp as SetDRP<number>).add(2);
		const message = NetworkPb.Message.create({
			sender: mockSender,
			type: NetworkPb.MessageType.MESSAGE_TYPE_SYNC,
			data: NetworkPb.Sync.encode(
				NetworkPb.Sync.create({
					objectId: drpObject.id,
					vertexHashes: drpObject.vertices.map((vertex) => vertex.hash),
				})
			).finish(),
		});
		const success = await syncHandler(node, message.sender, message.data);
		expect(success).toBe(true);
		expect(node.getObject(drpObject.id)?.vertices.length).toBe(3);
		expect(drpObject.vertices.length).toBe(5);
	});

	test("should handle sync accept message correctly", async () => {
		const vertices = drpObject.vertices.slice(3, 5);
		await signGeneratedVertices(node2, vertices);

		const message = NetworkPb.Message.create({
			sender: mockSender,
			type: NetworkPb.MessageType.MESSAGE_TYPE_SYNC_ACCEPT,
			data: NetworkPb.SyncAccept.encode(
				NetworkPb.SyncAccept.create({
					objectId: drpObject.id,
					requested: vertices,
					requesting: [],
					attestations: [],
				})
			).finish(),
		});
		const success = await syncAcceptHandler(node, message.sender, message.data);
		expect(success).toBe(false);
		expect(node.getObject(drpObject.id)?.vertices.length).toBe(5);
		expect(drpObject.vertices.length).toBe(5);
	});

	test("should handle update attestation message correctly", async () => {
		const attestations = node.getObject(drpObject.id)?.vertices.map((vertex) => {
			return {
				data: vertex.hash,
				signature: node2.credentialStore.signWithBls(vertex.hash),
			};
		});
		const message = NetworkPb.Message.create({
			sender: mockSender,
			type: NetworkPb.MessageType.MESSAGE_TYPE_ATTESTATION_UPDATE,
			data: NetworkPb.AttestationUpdate.encode(
				NetworkPb.AttestationUpdate.create({
					objectId: drpObject.id,
					attestations,
				})
			).finish(),
		});
		const success = await attestationUpdateHandler(node, message.sender, message.data);
		expect(success).toBe(true);
	});
});
