import { SecretKey } from "@chainsafe/bls/herumi";
import type { SecretKey as BlsSecretKey } from "@chainsafe/bls/types";
import { deriveKeyFromEntropy } from "@chainsafe/bls-keygen";
import { generateKeyPair, generateKeyPairFromSeed } from "@libp2p/crypto/keys";
import type { Ed25519PrivateKey } from "@libp2p/interface";
import { DRPPublicCredential } from "@ts-drp/types";
import { toString as uint8ArrayToString } from "uint8arrays";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";

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
			this._blsPrivateKey = SecretKey.fromBytes(deriveKeyFromEntropy(seed));
		} else {
			this._ed25519PrivateKey = await generateKeyPair("Ed25519");
			this._blsPrivateKey = SecretKey.fromKeygen();
		}
	}

	getPublicCredential(): DRPPublicCredential {
		if (!this._ed25519PrivateKey || !this._blsPrivateKey) {
			throw new Error("Private key not found");
		}
		return {
			ed25519PublicKey: uint8ArrayToString(this._ed25519PrivateKey?.publicKey.raw, "base64"),
			blsPublicKey: uint8ArrayToString(this._blsPrivateKey?.toPublicKey().toBytes(), "base64"),
		};
	}

	async signWithEd25519(data: string): Promise<Uint8Array> {
		if (!this._ed25519PrivateKey) {
			throw new Error("Private key not found");
		}

		const signature = await this._ed25519PrivateKey.sign(uint8ArrayFromString(data));
		return new Uint8Array(signature);
	}

	signWithBls(data: string): Uint8Array {
		if (!this._blsPrivateKey) {
			throw new Error("Private key not found");
		}

		return this._blsPrivateKey.sign(uint8ArrayFromString(data)).toBytes();
	}
}
