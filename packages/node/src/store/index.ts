import type { DRPObject, DRPPublicCredential, Vertex } from "@ts-drp/object";
import { generateKeyPair, generateKeyPairFromSeed } from "@libp2p/crypto/keys";
import type { Ed25519PrivateKey } from "@libp2p/interface";
import bls from "@chainsafe/bls";
import type { SecretKey as BlsSecretKey } from "@chainsafe/bls/types";
import { deriveKeyFromEntropy } from "@chainsafe/bls-keygen";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays";

export type DRPObjectStoreCallback = (
	objectId: string,
	object: DRPObject,
) => void;

export class DRPObjectStore {
	// TODO: should be abstracted in handling multiple types of storage
	private _store: Map<string, DRPObject>;
	private _subscriptions: Map<string, DRPObjectStoreCallback[]>;

	constructor() {
		this._store = new Map<string, DRPObject>();
		this._subscriptions = new Map<string, DRPObjectStoreCallback[]>();
	}

	get(objectId: string): DRPObject | undefined {
		return this._store.get(objectId);
	}

	put(objectId: string, object: DRPObject) {
		this._store.set(objectId, object);
		this._notifySubscribers(objectId, object);
	}

	subscribe(objectId: string, callback: DRPObjectStoreCallback): void {
		if (!this._subscriptions.has(objectId)) {
			this._subscriptions.set(objectId, []);
		}
		this._subscriptions.get(objectId)?.push(callback);
	}

	private _notifySubscribers(objectId: string, object: DRPObject): void {
		const callbacks = this._subscriptions.get(objectId);
		if (callbacks) {
			for (const callback of callbacks) {
				callback(objectId, object);
			}
		}
	}

	remove(objectId: string) {
		this._store.delete(objectId);
	}
}

export interface DRPCredentialConfig {
	private_key_seed?: string;
}

export class DRPCredentialStore {
	private _config?: DRPCredentialConfig;
	private _ed25519PrivateKey?: Ed25519PrivateKey;
	private _blsPrivateKey?: BlsSecretKey;

	constructor(config?: DRPCredentialConfig) {
		this._config = config;
	}

	async start() {
		if (this._config?.private_key_seed) {
			const tmp = this._config.private_key_seed.padEnd(32, "0");
			const seed = uint8ArrayFromString(tmp);
			this._ed25519PrivateKey = await generateKeyPairFromSeed("Ed25519", seed);
			this._blsPrivateKey = bls.SecretKey.fromBytes(deriveKeyFromEntropy(seed));
		} else {
			this._ed25519PrivateKey = await generateKeyPair("Ed25519");
			this._blsPrivateKey = bls.SecretKey.fromKeygen();
		}
	}

	getPublicCredential(): DRPPublicCredential {
		return {
			ed25519PublicKey: uint8ArrayToString(
				this._ed25519PrivateKey?.publicKey.raw as Uint8Array,
				"base64",
			),
			blsPublicKey: uint8ArrayToString(
				this._blsPrivateKey?.toPublicKey().toBytes() as Uint8Array,
				"base64",
			),
		};
	}

	async sign(data: string): Promise<string> {
		const signature = await this._ed25519PrivateKey?.sign(uint8ArrayFromString(data));
		return uint8ArrayToString(signature, "base64");
	}
}
