import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { DRPNode } from "../src/index.js";
import { DRPObject } from "@topology-foundation/object/src/index.js";
import { AddWinsSet } from "@topology-foundation/blueprints/src/index.js";
import { NetworkPb } from "@topology-foundation/network/src/index.js";
import { updateHandler } from "../src/handlers.js";

describe("Handle message correctly", () => {
  let node: DRPNode;
  let drpObject: DRPObject;

  beforeAll(async () => {
    node = new DRPNode();
    await node.start();

    drpObject = new DRPObject("", new AddWinsSet<number>());
    await node.createObject(new AddWinsSet<number>(), drpObject.id);

    (drpObject.drp as AddWinsSet<number>).add(5);
    (drpObject.drp as AddWinsSet<number>).add(10);
  });

  test("update handler", async () => {
    const message = NetworkPb.Message.create({
      sender: "",
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

    const vertices = node.getObject(drpObject.id)?.hashGraph.getAllVertices().map((vertex) => {
      return vertex.operation
    });
    expect(vertices).toStrictEqual([
      { type: "-1", value: null },
      { type: "add", value: [5] },
      { type: "add", value: [10] },
    ]);
  });
});