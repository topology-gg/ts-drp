import type { GossipsubMessage } from "@chainsafe/libp2p-gossipsub";
import type { EventCallback, StreamHandler } from "@libp2p/interface";
import { Logger, type LoggerOptions } from "@ts-drp/logger";
import {
	DRPNetworkNode,
	type DRPNetworkNodeConfig,
	NetworkPb,
} from "@ts-drp/network";
import { type DRP, DRPObject, type Vertex } from "@ts-drp/object";
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
	private _drpIDs: Set<string> = new Set();
	config?: DRPNodeConfig;
	objectStore: DRPObjectStore;
	networkNode: DRPNetworkNode;

	constructor(config?: DRPNodeConfig) {
		this.config = config;
		log = new Logger("drp::node", config?.log_config);
		this.networkNode = new DRPNetworkNode({
			...config?.network_config,
			auto_keep_alive_callback: (ids) => ids.some((id) => this._drpIDs.has(id)),
		});
		this.objectStore = new DRPObjectStore({
			putCallback: this.putCallback.bind(this),
			removeCallback: this.removeCallback.bind(this),
		});
	}

	async start(): Promise<void> {
		await this.networkNode.start();
		this.networkNode.addMessageHandler(async ({ stream }) =>
			drpMessagesHandler(this, stream),
		);
	}

	async restart(config?: DRPNodeConfig): Promise<void> {
		await this.networkNode.stop();
		this.networkNode = new DRPNetworkNode(
			config ? config.network_config : this.config?.network_config,
		);
		await this.start();
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

	sendCustomMessage(peerId: string, data: Uint8Array) {
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

	async unsubscribeObject(id: string, purge?: boolean) {
		await operations.unsubscribeObject(this, id, purge);
	}

	async syncObject(id: string, peerId?: string) {
		operations.syncObject(this, id, peerId);
	}

	async signVertex(vertex: Vertex) {
		if (vertex.peerId !== this.networkNode.peerId) {
			throw new Error("Invalid peerId");
		}

		vertex.signature = await this.networkNode.sign(vertex.hash);
	}

	async putCallback(objectId: string) {
		this._drpIDs.add(objectId);
		await this.networkNode.setKeepAliveForSubscribers(objectId, true);
	}

	async removeCallback(objectId: string) {
		this._drpIDs.delete(objectId);
		await this.networkNode.setKeepAliveForSubscribers(
			objectId,
			false,
			Array.from(this._drpIDs),
		);
	}
}
