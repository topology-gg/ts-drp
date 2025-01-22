import {
	type GossipsubEvents,
	type GossipsubMessage,
	gossipsub,
} from "@chainsafe/libp2p-gossipsub";
import { createPeerScoreParams } from "@chainsafe/libp2p-gossipsub/score";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { autoNAT } from "@libp2p/autonat";
import { bootstrap } from "@libp2p/bootstrap";
import {
	circuitRelayServer,
	circuitRelayTransport,
} from "@libp2p/circuit-relay-v2";
import { generateKeyPairFromSeed } from "@libp2p/crypto/keys";
import { dcutr } from "@libp2p/dcutr";
import { devToolsMetrics } from "@libp2p/devtools-metrics";
import { identify, identifyPush } from "@libp2p/identify";
import type {
	EventCallback,
	PubSub,
	Stream,
	StreamHandler,
} from "@libp2p/interface";
import { type KadDHTInit, kadDHT, passthroughMapper } from "@libp2p/kad-dht";
import { ping } from "@libp2p/ping";
import { webRTC, webRTCDirect } from "@libp2p/webrtc";
import { webSockets } from "@libp2p/websockets";
import * as filters from "@libp2p/websockets/filters";
import { webTransport } from "@libp2p/webtransport";
import { type MultiaddrInput, multiaddr } from "@multiformats/multiaddr";
import { Logger, type LoggerOptions } from "@ts-drp/logger";
import { type Libp2p, type ServiceFactoryMap, createLibp2p } from "libp2p";
import { fromString } from "multiformats/bytes";
import { CID } from "multiformats/cid";
import * as raw from "multiformats/codecs/raw";
import { sha256 } from "multiformats/hashes/sha2";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { Message } from "./proto/drp/network/v1/messages_pb.js";
import { uint8ArrayToStream } from "./stream.js";

export * from "./stream.js";

export const DRP_MESSAGE_PROTOCOL = "/drp/message/0.0.1";
export const BOOTSTRAP_NODES = [
	"/dns4/bootstrap1.topology.gg/tcp/443/wss/p2p/12D3KooWBu1pZ3v2u6tXSmkN35kiMLENpv3bEXcyT1GJTVhipAkG",
	"/dns4/bootstrap2.topology.gg/tcp/443/wss/p2p/12D3KooWLGuTtCHLpd1SBHeyvzT3kHVe2dw8P7UdoXsfQHu8qvkf",
];
let log: Logger;

// snake_casing to match the JSON config
export interface DRPNetworkNodeConfig {
	addresses?: string[];
	bootstrap?: boolean;
	bootstrap_peers?: string[];
	browser_metrics?: boolean;
	private_key_seed?: string;
	log_config?: LoggerOptions;
}

export class DRPNetworkNode {
	private _config?: DRPNetworkNodeConfig;
	private _node?: Libp2p;
	private _pubsub?: PubSub<GossipsubEvents>;

	peerId = "";

	constructor(config?: DRPNetworkNodeConfig) {
		this._config = config;
		log = new Logger("drp::network", config?.log_config);
	}

	async start() {
		let privateKey = undefined;
		if (this._config?.private_key_seed) {
			const tmp = this._config.private_key_seed.padEnd(32, "0");
			privateKey = await generateKeyPairFromSeed(
				"Ed25519",
				uint8ArrayFromString(tmp),
			);
		}

		const _bootstrapNodesList = this._config?.bootstrap_peers
			? this._config.bootstrap_peers
			: BOOTSTRAP_NODES;

		const _peerDiscovery = _bootstrapNodesList.length
			? [
					bootstrap({
						list: _bootstrapNodesList,
					}),
				]
			: [];

		const defaultDHTConfig: KadDHTInit = {
			protocol: "/drp/dht/0.0.1",
			clientMode: true,
			peerInfoMapper: passthroughMapper,
			reprovide: {
				concurrency: 10,
				maxQueueSize: 16_384,
				interval: 1_800_000, // 30 minutes
				validity: 3_600_000, // 1 hour
			},
		};

		const _node_services: ServiceFactoryMap = {
			ping: ping(),
			kadDHT: kadDHT(defaultDHTConfig),
			autonat: autoNAT(),
			dcutr: dcutr(),
			identify: identify(),
			identifyPush: identifyPush(),
		};

		if (this._config?.addresses) {
			_node_services.kadDHT = kadDHT({
				...defaultDHTConfig,
				clientMode: false,
			});
		} else {
			_node_services.pubsub = gossipsub({
				allowPublishToZeroTopicPeers: true,
				scoreParams: createPeerScoreParams({
					IPColocationFactorWeight: 0,
				}),
				fallbackToFloodsub: false,
			});
		}

		const _bootstrap_services = {
			..._node_services,
			relay: circuitRelayServer({
				reservations: {
					maxReservations: Number.POSITIVE_INFINITY,
				},
			}),
		};

		this._node = await createLibp2p({
			privateKey,
			addresses: {
				listen: this._config?.addresses
					? this._config.addresses
					: ["/p2p-circuit", "/webrtc"],
			},
			connectionEncrypters: [noise()],
			connectionGater: {
				denyDialMultiaddr: () => {
					return false;
				},
			},
			metrics: this._config?.browser_metrics ? devToolsMetrics() : undefined,
			peerDiscovery: _peerDiscovery,
			services: this._config?.bootstrap ? _bootstrap_services : _node_services,
			streamMuxers: [yamux()],
			transports: [
				circuitRelayTransport(),
				webRTC(),
				webRTCDirect(),
				webSockets({
					filter: filters.all,
				}),
				webTransport(),
			],
		});

		log.info("running on:", this._node.getMultiaddrs());
		if (!this._config?.bootstrap) {
			for (const addr of this._config?.bootstrap_peers || []) {
				try {
					await this._node.dial(multiaddr(addr));
				} catch (e) {
					log.error("::start::dial::error", e);
				}
			}
		}

		this._pubsub = this._node.services.pubsub as PubSub<GossipsubEvents>;
		this.peerId = this._node.peerId.toString();

		log.info(
			"::start: Successfuly started DRP network w/ peer_id",
			this.peerId,
		);

		this._node.addEventListener("peer:connect", (e) =>
			log.info("::start::peer::connect", e.detail),
		);
		this._node.addEventListener("peer:identify", (e) =>
			log.info("::start::peer::identify", e.detail),
		);
	}

	async stop() {
		await this._node?.stop();
	}

	async restart(config?: DRPNetworkNodeConfig) {
		await this.stop();
		if (config) this._config = config;
		await this.start();
	}

	async getTopicCid(topic: string) {
		const digest = await sha256.digest(fromString(topic));
		const cid = CID.create(1, raw.code, digest);
		return cid;
	}

	async provideTopic(topic: string) {
		const cid = await this.getTopicCid(topic);
		await this._node?.contentRouting.provide(cid);
	}

	async findPeerInTopic(topic: string) {
		const cid = await this.getTopicCid(topic);
		const providers = this._node?.contentRouting.findProviders(cid, {
			useNetwork: true,
		});
		if (!providers) return;
		for await (const provider of providers) {
			console.log("provider", provider.id.toString());
		}
		return providers;
	}

	subscribe(topic: string) {
		if (!this._node) {
			log.error("::subscribe: Node not initialized, please run .start()");
			return;
		}

		try {
			this._pubsub?.subscribe(topic);
			this.provideTopic(topic).catch((e) => {
				log.error("::subscribe: Error providing topic", e);
			});
			this.findPeerInTopic(topic).catch((e) => {
				log.error("::subscribe: Error finding peer in topic", e);
			});
			log.info("::subscribe: Successfuly subscribed the topic", topic);
		} catch (e) {
			log.error("::subscribe:", e);
		}
	}

	unsubscribe(topic: string) {
		if (!this._node) {
			log.error("::unsubscribe: Node not initialized, please run .start()");
			return;
		}

		try {
			this._pubsub?.unsubscribe(topic);
			log.info("::unsubscribe: Successfuly unsubscribed the topic", topic);
		} catch (e) {
			log.error("::unsubscribe:", e);
		}
	}

	async connect(addr: MultiaddrInput) {
		try {
			await this._node?.dial([multiaddr(addr)]);
			log.info("::connect: Successfuly dialed", addr);
		} catch (e) {
			log.error("::connect:", e);
		}
	}

	async disconnect(peerId: string) {
		try {
			await this._node?.hangUp(multiaddr(`/p2p/${peerId}`));
			log.info("::disconnect: Successfuly disconnected", peerId);
		} catch (e) {
			log.error("::disconnect:", e);
		}
	}

	getBootstrapNodes() {
		return this._config?.bootstrap_peers ?? BOOTSTRAP_NODES;
	}

	getMultiaddrs() {
		return this._node?.getMultiaddrs().map((addr) => addr.toString());
	}

	getAllPeers() {
		const peers = this._node?.getPeers();
		if (!peers) return [];
		return peers.map((peer) => peer.toString());
	}

	getGroupPeers(group: string) {
		const peers = this._pubsub?.getSubscribers(group);
		if (!peers) return [];
		return peers.map((peer) => peer.toString());
	}

	async broadcastMessage(topic: string, message: Message) {
		try {
			const messageBuffer = Message.encode(message).finish();
			await this._pubsub?.publish(topic, messageBuffer);

			log.info(
				"::broadcastMessage: Successfuly broadcasted message to topic",
				topic,
			);
		} catch (e) {
			log.error("::broadcastMessage:", e);
		}
	}

	async sendMessage(peerId: string, message: Message) {
		try {
			const connection = await this._node?.dial([multiaddr(`/p2p/${peerId}`)]);
			const stream = <Stream>await connection?.newStream(DRP_MESSAGE_PROTOCOL);
			const messageBuffer = Message.encode(message).finish();
			uint8ArrayToStream(stream, messageBuffer);
		} catch (e) {
			log.error("::sendMessage:", e);
		}
	}

	async sendGroupMessageRandomPeer(group: string, message: Message) {
		try {
			const peers = this._pubsub?.getSubscribers(group);
			if (!peers || peers.length === 0) throw Error("Topic wo/ peers");
			const peerId = peers[Math.floor(Math.random() * peers.length)];

			const connection = await this._node?.dial(peerId);
			const stream: Stream = (await connection?.newStream(
				DRP_MESSAGE_PROTOCOL,
			)) as Stream;
			const messageBuffer = Message.encode(message).finish();
			uint8ArrayToStream(stream, messageBuffer);
		} catch (e) {
			log.error("::sendMessageRandomTopicPeer:", e);
		}
	}

	addGroupMessageHandler(
		group: string,
		handler: EventCallback<CustomEvent<GossipsubMessage>>,
	) {
		this._pubsub?.addEventListener("gossipsub:message", (e) => {
			if (group && e.detail.msg.topic !== group) return;
			handler(e);
		});
	}

	addMessageHandler(handler: StreamHandler) {
		this._node?.handle(DRP_MESSAGE_PROTOCOL, handler);
	}

	addCustomMessageHandler(protocol: string | string[], handler: StreamHandler) {
		this._node?.handle(protocol, handler);
	}
}
