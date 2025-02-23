import bls from "@chainsafe/bls/herumi";
import type { SecretKey as BlsSecretKey } from "@chainsafe/bls/types";
import { deriveKeyFromEntropy } from "@chainsafe/bls-keygen";
import { generateKeyPair, privateKeyFromRaw } from "@libp2p/crypto/keys";
import type { Secp256k1PrivateKey } from "@libp2p/interface";
import { etc } from "@noble/secp256k1";
import type { DRPPublicCredential } from "@ts-drp/object";
import { toString as uint8ArrayToString } from "uint8arrays";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";

export interface DRPCredentialConfig {
	private_key_seed?: string;
}

export class DRPCredentialStore {
	private _config?: DRPCredentialConfig;
	private _secp256k1PrivateKey?: Secp256k1PrivateKey;
	private _blsPrivateKey?: BlsSecretKey;

	constructor(config?: DRPCredentialConfig) {
		this._config = config;
	}

	async start() {
		if (this._config?.private_key_seed) {
			const tmp = this._config.private_key_seed.padEnd(64, "0");
			const seed = uint8ArrayFromString(tmp);
			const rawPrivateKey = etc.hashToPrivateKey(seed);
			this._secp256k1PrivateKey = privateKeyFromRaw(rawPrivateKey) as Secp256k1PrivateKey;
			this._blsPrivateKey = bls.SecretKey.fromBytes(deriveKeyFromEntropy(seed));
		} else {
			this._secp256k1PrivateKey = await generateKeyPair("secp256k1");
			this._blsPrivateKey = bls.SecretKey.fromKeygen();
		}
	}

	getPublicCredential(): DRPPublicCredential {
		if (!this._secp256k1PrivateKey || !this._blsPrivateKey) {
			throw new Error("Private key not found");
		}
		return {
			secp256k1PublicKey: uint8ArrayToString(this._secp256k1PrivateKey?.publicKey.raw, "base64"),
			blsPublicKey: uint8ArrayToString(this._blsPrivateKey?.toPublicKey().toBytes(), "base64"),
		};
	}

	signWithBls(data: string): Uint8Array {
		if (!this._blsPrivateKey) {
			throw new Error("Private key not found");
		}

		return this._blsPrivateKey.sign(uint8ArrayFromString(data)).toBytes();
	}
}
