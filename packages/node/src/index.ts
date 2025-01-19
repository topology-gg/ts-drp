import type { GossipsubMessage } from "@chainsafe/libp2p-gossipsub";
import type { EventCallback, StreamHandler } from "@libp2p/interface";
import { Logger, type LoggerOptions } from "@ts-drp/logger";
import {
	DRPNetworkNode,
	type DRPNetworkNodeConfig,
	NetworkPb,
} from "@ts-drp/network";
import { type DRP, DRPObject, type IACL } from "@ts-drp/object";
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
		await this.networkNode.addMessageHandler(({ stream }) => {
			drpMessagesHandler(this, stream).catch((e) =>
				log.error("::start:drpMessagesHandler: Error handling message", e),
			);
		});
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

	async sendGroupMessage(group: string, data: Uint8Array) {
		const message = NetworkPb.Message.create({
			sender: this.networkNode.peerId,
			type: NetworkPb.MessageType.MESSAGE_TYPE_CUSTOM,
			data,
		});
		await this.networkNode.broadcastMessage(group, message);
	}

	async addCustomMessageHandler(
		protocol: string | string[],
		handler: StreamHandler,
	) {
		await this.networkNode.addCustomMessageHandler(protocol, handler);
	}

	async sendCustomMessage(peerId: string, data: Uint8Array) {
		const message = NetworkPb.Message.create({
			sender: this.networkNode.peerId,
			type: NetworkPb.MessageType.MESSAGE_TYPE_CUSTOM,
			data,
		});
		await this.networkNode.sendMessage(peerId, message);
	}

	async createObject(
		drp: DRP,
		id?: string,
		abi?: string,
		sync?: boolean,
		peerId?: string,
	) {
		const object = new DRPObject(
			this.networkNode.peerId,
			drp,
			null as unknown as IACL & DRP,
			id,
			abi,
		);
		operations.createObject(this, object);
		operations.subscribeObject(this, object.id);
		if (sync) {
			await operations.syncObject(this, object.id, peerId);
		}
		return object;
	}

	subscribeObject(id: string) {
		return operations.subscribeObject(this, id);
	}

	unsubscribeObject(id: string, purge?: boolean) {
		operations.unsubscribeObject(this, id, purge);
	}

	async syncObject(id: string, peerId?: string) {
		await operations.syncObject(this, id, peerId);
	}
}
