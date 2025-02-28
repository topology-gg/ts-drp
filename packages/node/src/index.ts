import type { GossipsubMessage } from "@chainsafe/libp2p-gossipsub";
import type { EventCallback, IncomingStreamData, StreamHandler } from "@libp2p/interface";
import { Keychain } from "@ts-drp/keychain";
import { Logger } from "@ts-drp/logger";
import { DRPNetworkNode } from "@ts-drp/network";
import { type DRP, DRPObject } from "@ts-drp/object";
import { IMetrics } from "@ts-drp/tracer";
import { type ACL, DRPNodeConfig, Message, MessageType } from "@ts-drp/types";

import { drpMessagesHandler } from "./handlers.js";
import { logger } from "./logger.js";
import * as operations from "./operations.js";
import { DRPObjectStore } from "./store/index.js";

export { serializeStateMessage, deserializeStateMessage } from "./utils/serialize.js";
export { loadConfig } from "./utils/config.js";

// snake_casing to match the JSON config
export class DRPNode {
	config?: DRPNodeConfig;
	objectStore: DRPObjectStore;
	networkNode: DRPNetworkNode;
	keychain: Keychain;

	constructor(config?: DRPNodeConfig) {
		this.config = config;
		logger.log = new Logger("drp::node", config?.log_config);
		this.networkNode = new DRPNetworkNode(config?.network_config);
		this.objectStore = new DRPObjectStore();
		this.keychain = new Keychain(config?.keychain_config);
	}

	async start(): Promise<void> {
		await this.keychain.start();
		await this.networkNode.start(this.keychain.ed25519PrivateKey);
		await this.networkNode.addMessageHandler(async ({ stream }: IncomingStreamData) =>
			drpMessagesHandler(this, stream)
		);
		logger.log?.info("DRPNode started");
	}

	async restart(config?: DRPNodeConfig): Promise<void> {
		await this.networkNode.stop();
		this.networkNode = new DRPNetworkNode(
			config ? config.network_config : this.config?.network_config
		);
		await this.start();
	}

	addCustomGroup(group: string) {
		this.networkNode.subscribe(group);
	}

	addCustomGroupMessageHandler(
		group: string,
		handler: EventCallback<CustomEvent<GossipsubMessage>>
	) {
		this.networkNode.addGroupMessageHandler(group, handler);
	}

	async sendGroupMessage(group: string, data: Uint8Array) {
		const message = Message.create({
			sender: this.networkNode.peerId,
			type: MessageType.MESSAGE_TYPE_CUSTOM,
			data,
		});
		await this.networkNode.broadcastMessage(group, message);
	}

	async addCustomMessageHandler(protocol: string | string[], handler: StreamHandler) {
		await this.networkNode.addCustomMessageHandler(protocol, handler);
	}

	async sendCustomMessage(peerId: string, data: Uint8Array) {
		const message = Message.create({
			sender: this.networkNode.peerId,
			type: MessageType.MESSAGE_TYPE_CUSTOM,
			data,
		});
		await this.networkNode.sendMessage(peerId, message);
	}

	async createObject<T extends DRP>(options: {
		drp?: T;
		acl?: ACL;
		id?: string;
		sync?: {
			enabled: boolean;
			peerId?: string;
		};
		metrics?: IMetrics;
	}): Promise<DRPObject<T>> {
		const object = new DRPObject<T>({
			peerId: this.networkNode.peerId,
			publicCredential: options.acl ? undefined : this.keychain.getPublicCredential(),
			acl: options.acl,
			drp: options.drp,
			id: options.id,
			metrics: options.metrics,
		});
		operations.createObject(this, object);
		await operations.subscribeObject(this, object.id);
		if (options.sync?.enabled) {
			await operations.syncObject(this, object.id, options.sync.peerId);
		}
		return object;
	}

	/*
		Connect to an existing object
		@param options.id - The object ID
		@param options.drp - The DRP instance. It can be undefined
			where we just want the HG state
		@param options.sync.peerId - The peer ID to sync with
	*/
	async connectObject<T extends DRP>(options: {
		id: string;
		drp?: T;
		sync?: {
			peerId?: string;
		};
		metrics?: IMetrics;
	}): Promise<DRPObject<T>> {
		const object = operations.connectObject(this, options.id, {
			peerId: options.sync?.peerId,
			drp: options.drp,
			metrics: options.metrics,
		});
		return object;
	}

	async subscribeObject(id: string) {
		await operations.subscribeObject(this, id);
	}

	unsubscribeObject(id: string, purge?: boolean) {
		operations.unsubscribeObject(this, id, purge);
		this.networkNode.removeTopicScoreParams(id);
	}

	async syncObject(id: string, peerId?: string) {
		await operations.syncObject(this, id, peerId);
	}
}
