import type { GossipsubMessage } from "@chainsafe/libp2p-gossipsub";
import type { EventCallback, StreamHandler } from "@libp2p/interface";
import { Logger, type LoggerOptions } from "@ts-drp/logger";
import {
	DRPNetworkNode,
	type DRPNetworkNodeConfig,
	NetworkPb,
} from "@ts-drp/network";
import { type ACL, type DRP, DRPObject } from "@ts-drp/object";
import { drpMessagesHandler } from "./handlers.js";
import * as operations from "./operations.js";
import {
	type DRPCredentialConfig,
	DRPCredentialStore,
	DRPObjectStore,
} from "./store/index.js";

// snake_casing to match the JSON config
export interface DRPNodeConfig {
	log_config?: LoggerOptions;
	network_config?: DRPNetworkNodeConfig;
	credential_config?: DRPCredentialConfig;
}

export let log: Logger;

export class DRPNode {
	config?: DRPNodeConfig;
	objectStore: DRPObjectStore;
	networkNode: DRPNetworkNode;
	credentialStore: DRPCredentialStore;

	constructor(config?: DRPNodeConfig) {
		this.config = config;
		log = new Logger("drp::node", config?.log_config);
		this.networkNode = new DRPNetworkNode(config?.network_config);
		this.objectStore = new DRPObjectStore();
		this.credentialStore = new DRPCredentialStore(config?.credential_config);
	}

	async start(): Promise<void> {
		await this.credentialStore.start();
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

	async createObject(options: {
		drp?: DRP;
		acl?: ACL;
		id?: string;
		sync?: {
			enabled: boolean;
			peerId?: string;
		};
	}) {
		const object = new DRPObject({
			peerId: this.networkNode.peerId,
			publicCredential: options.acl
				? undefined
				: this.credentialStore.getPublicCredential(),
			acl: options.acl,
			drp: options.drp,
			id: options.id,
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
	async connectObject(options: {
		id: string;
		drp?: DRP;
		sync?: {
			peerId?: string;
		};
	}) {
		const object = operations.connectObject(
			this,
			options.id,
			options.drp,
			options.sync?.peerId,
		);
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
