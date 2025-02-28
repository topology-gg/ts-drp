import { KeychainConfig } from "../keychain/keychain.js";
import { LoggerOptions } from "../logger/logger.js";
import { DRPNetworkNodeConfig } from "../network/network.js";

export interface DRPNodeConfig {
	log_config?: LoggerOptions;
	network_config?: DRPNetworkNodeConfig;
	keychain_config?: KeychainConfig;
}
