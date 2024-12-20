import type { GossipsubMessage } from "@chainsafe/libp2p-gossipsub";
import type { EventCallback, StreamHandler } from "@libp2p/interface";
import { Logger, type LoggerOptions } from "@ts-drp/logger";
import {
	DRPNetworkNode,
	type DRPNetworkNodeConfig,
	NetworkPb,
} from "@ts-drp/network";
import { type DRP, DRPObject } from "@ts-drp/object";
import { drpMessagesHandler } from "./handlers.js";
import * as operations from "./operations.js";
import { DRPObjectStore } from "./store/index.js";

// snake_casing to match the JSON config
export interface DRPNodeConfig {
	log_config?: LoggerOptions;
	network_config?: DRPNetworkNodeConfig;
}

export let log: Logger;

export class DRPNode {
	config?: DRPNodeConfig;
	objectStore: DRPObjectStore;
	networkNode: DRPNetworkNode;

	constructor(config?: DRPNodeConfig) {
		this.config = config;
		log = new Logger("drp::node", config?.log_config);
		this.networkNode = new DRPNetworkNode(config?.network_config);
		this.objectStore = new DRPObjectStore();
	}

	async start(): Promise<void> {
		await this.networkNode.start();
		this.networkNode.addMessageHandler(async ({ stream }) =>
			drpMessagesHandler(this, stream),
		);
	}

	addCustomGroup(group: string) {
		this.networkNode.subscribe(group);
	}

	addCustomGroupMessageHandler(
		group: string,
		handler: EventCallback<CustomEvent<GossipsubMessage>>,
	) {
		this.networkNode.addGroupMessageHandler(group, handler);
	}

	sendGroupMessage(group: string, data: Uint8Array) {
		const message = NetworkPb.Message.create({
			sender: this.networkNode.peerId,
			type: NetworkPb.MessageType.MESSAGE_TYPE_CUSTOM,
			data,
		});
		this.networkNode.broadcastMessage(group, message);
	}

	addCustomMessageHandler(protocol: string | string[], handler: StreamHandler) {
		this.networkNode.addCustomMessageHandler(protocol, handler);
	}

	sendCustomMessage(peerId: string, protocol: string, data: Uint8Array) {
		const message = NetworkPb.Message.create({
			sender: this.networkNode.peerId,
			type: NetworkPb.MessageType.MESSAGE_TYPE_CUSTOM,
			data,
		});
		this.networkNode.sendMessage(peerId, message);
	}

	async createObject(
		drp: DRP,
		id?: string,
		abi?: string,
		sync?: boolean,
		peerId?: string,
	) {
		const object = new DRPObject(this.networkNode.peerId, drp, id, abi);
		operations.createObject(this, object);
		operations.subscribeObject(this, object.id);
		if (sync) {
			operations.syncObject(this, object.id, peerId);
		}
		return object;
	}

	async subscribeObject(id: string) {
		return operations.subscribeObject(this, id);
	}

	unsubscribeObject(id: string, purge?: boolean) {
		operations.unsubscribeObject(this, id, purge);
	}

	async syncObject(id: string, peerId?: string) {
		operations.syncObject(this, id, peerId);
	}
}
