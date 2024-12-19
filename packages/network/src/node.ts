import {
	type GossipsubEvents,
	type GossipsubMessage,
	gossipsub,
} from "@chainsafe/libp2p-gossipsub";
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
import { identify } from "@libp2p/identify";
import type {
	Ed25519PrivateKey,
	EventCallback,
	PubSub,
	Stream,
	StreamHandler,
} from "@libp2p/interface";
import { pubsubPeerDiscovery } from "@libp2p/pubsub-peer-discovery";
import { webRTC, webRTCDirect } from "@libp2p/webrtc";
import { webSockets } from "@libp2p/websockets";
import * as filters from "@libp2p/websockets/filters";
import { webTransport } from "@libp2p/webtransport";
import { multiaddr } from "@multiformats/multiaddr";
import { Logger, type LoggerOptions } from "@ts-drp/logger";
import { fromByteArray } from "base64-js";
import { type Libp2p, createLibp2p } from "libp2p";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { Message } from "./proto/drp/network/v1/messages_pb.js";
import type { Vertex } from "./proto/drp/object/v1/object_pb.js";
import { uint8ArrayToStream } from "./stream.js";

export * from "./stream.js";

export const DRP_MESSAGE_PROTOCOL = "/drp/message/0.0.1";
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
	private _privateKey?: Ed25519PrivateKey;
	publicKey?: string;
	peerId = "";

	constructor(config?: DRPNetworkNodeConfig) {
		this._config = config;
		log = new Logger("drp::network", config?.log_config);
	}

	async start() {
		if (this._config?.private_key_seed) {
			const tmp = this._config.private_key_seed.padEnd(32, "0");
			this._privateKey = await generateKeyPairFromSeed(
				"Ed25519",
				uint8ArrayFromString(tmp),
			);
			this.publicKey = fromByteArray(this._privateKey.publicKey.raw);
		}

		const _bootstrapNodesList = this._config?.bootstrap_peers
			? this._config.bootstrap_peers
			: [
					"/dns4/bootstrap1.topology.gg/tcp/443/wss/p2p/12D3KooWBu1pZ3v2u6tXSmkN35kiMLENpv3bEXcyT1GJTVhipAkG",
					"/dns4/bootstrap2.topology.gg/tcp/443/wss/p2p/12D3KooWLGuTtCHLpd1SBHeyvzT3kHVe2dw8P7UdoXsfQHu8qvkf",
				];

		const _pubsubPeerDiscovery = pubsubPeerDiscovery({
			interval: 5_000,
			topics: ["drp::discovery"],
		});

		const _peerDiscovery = _bootstrapNodesList.length
			? [
					_pubsubPeerDiscovery,
					bootstrap({
						list: _bootstrapNodesList,
					}),
				]
			: [_pubsubPeerDiscovery];

		const _node_services = {
			autonat: autoNAT(),
			dcutr: dcutr(),
			identify: identify(),
			pubsub: gossipsub({
				allowPublishToZeroTopicPeers: true,
			}),
		};

		const _bootstrap_services = {
			..._node_services,
			relay: circuitRelayServer(),
		};

		this._node = await createLibp2p({
			privateKey: this._privateKey,
			addresses: {
				listen: this._config?.addresses
					? this._config.addresses
					: ["/webrtc", "/p2p-circuit"],
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
				circuitRelayTransport({
					reservationConcurrency: 1,
				}),
				webRTC(),
				webRTCDirect(),
				webSockets({
					filter: filters.all,
				}),
				webTransport(),
			],
		});

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
		this._node.addEventListener("peer:discovery", async (e) => {
			// current bug in v11.0.0 requires manual dial (https://github.com/libp2p/js-libp2p-pubsub-peer-discovery/issues/149)
			const sortedAddrs = e.detail.multiaddrs.sort((a, b) => {
				const localRegex =
					/(^\/ip4\/127\.)|(^\/ip4\/10\.)|(^\/ip4\/172\.1[6-9]\.)|(^\/ip4\/172\.2[0-9]\.)|(^\/ip4\/172\.3[0-1]\.)|(^\/ip4\/192\.168\.)/;
				const aLocal = localRegex.test(a.toString());
				const bLocal = localRegex.test(b.toString());
				const aWebrtc = a.toString().includes("/webrtc/");
				const bWebrtc = b.toString().includes("/webrtc/");
				if (aLocal && !bLocal) return 1;
				if (!aLocal && bLocal) return -1;
				if (aWebrtc && !bWebrtc) return -1;
				if (!aWebrtc && bWebrtc) return 1;
				return 0;
			});

			// Dial non-local multiaddrs, then WebRTC multiaddrs
			for (const address of sortedAddrs) {
				try {
					await this._node?.dial(address);
				} catch (e) {
					log.error("::start::peer::dial::error", e);
				}
			}

			log.info("::start::peer::discovery", e.detail);
		});
		this._node.addEventListener("peer:identify", (e) =>
			log.info("::start::peer::identify", e.detail),
		);
	}

	subscribe(topic: string) {
		if (!this._node) {
			log.error("::subscribe: Node not initialized, please run .start()");
			return;
		}

		try {
			this._pubsub?.subscribe(topic);
			this._pubsub?.getPeers();
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

	async signVertexOperation(vertex: Vertex): Promise<string> {
		if (vertex.nodeId !== this.peerId) {
			log.error("::signVertexOperation: Invalid peer id");
			return "";
		}
		if (!this._privateKey) {
			log.error("::signVertexOperation: Private key not found");
			return "";
		}

		const signature = await this._privateKey.sign(
			uint8ArrayFromString(JSON.stringify(vertex.operation)),
		);
		return fromByteArray(signature);
	}
}
