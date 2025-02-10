/* eslint-disable @typescript-eslint/no-explicit-any */
import { hash, RpcProvider } from "starknet";

import { RpcMethodName } from "./schema";

const DEFAULT_RPC_URL = "https://starknet-mainnet.public.blastapi.io/rpc/v0_7";
const starknetRpcUrl = import.meta.env.VITE_STARKNET_RPC_URL || DEFAULT_RPC_URL;
const starknet = new RpcProvider({ nodeUrl: starknetRpcUrl });

function extractBlockId(params: any) {
	// block ID, use directly
	if (typeof params === "string") {
		return params;
	}

	if ("block_hash" in params) {
		return params.block_hash;
	}

	if ("block_number" in params) {
		return params.block_number;
	}

	throw new Error("Invalid block ID");
}

type RpcHandler = (params: any) => Promise<any>;
export const handlers: Record<RpcMethodName, RpcHandler> = {
	starknet_getBlockWithTxHashes: async (params) => {
		const blockId = extractBlockId(params);
		return await starknet.getBlockWithTxHashes(blockId);
	},
	starknet_getBlockWithTxs: async (params) => {
		const blockId = extractBlockId(params);
		return await starknet.getBlockWithTxs(blockId);
	},
	starknet_getBlockWithReceipts: async (params) => {
		const blockId = extractBlockId(params);
		return await starknet.getBlockWithReceipts(blockId);
	},
	starknet_getStateUpdate: async (params) => {
		const blockId = extractBlockId(params);
		return await starknet.getStateUpdate(blockId);
	},
	starknet_getStorageAt: async (params) => {
		const { contract_address, key, block_id } = params;
		const blockId = extractBlockId(block_id);
		return await starknet.getStorageAt(contract_address, key, blockId);
	},
	starknet_getTransactionStatus: async (params) => {
		const { transaction_hash } = params;
		return await starknet.getTransactionStatus(transaction_hash);
	},
	starknet_getTransactionByHash: async (params) => {
		const { transaction_hash } = params;
		return await starknet.getTransactionByHash(transaction_hash);
	},
	starknet_getTransactionByBlockIdAndIndex: async (params) => {
		const { block_id, index } = params;
		const blockId = extractBlockId(block_id);
		return await starknet.getTransactionByBlockIdAndIndex(blockId, index);
	},
	starknet_getTransactionReceipt: async (params) => {
		const { transaction_hash } = params;
		return await starknet.getTransactionReceipt(transaction_hash);
	},
	starknet_getClass: async (params) => {
		const { block_id, class_hash } = params;
		const blockId = extractBlockId(block_id);
		return await starknet.getClass(class_hash, blockId);
	},
	starknet_getClassHashAt: async (params) => {
		const { block_id, contract_address } = params;
		const blockId = extractBlockId(block_id);
		return await starknet.getClassHashAt(contract_address, blockId);
	},
	starknet_getClassAt: async (params) => {
		const { block_id, contract_address } = params;
		const blockId = extractBlockId(block_id);
		return await starknet.getClassAt(contract_address, blockId);
	},
	starknet_getBlockTransactionCount: async (params) => {
		const blockId = extractBlockId(params);
		return await starknet.getBlockTransactionCount(blockId);
	},
	starknet_call: async (params) => {
		const { request, block_id } = params;
		const call = {
			contractAddress: request.contract_address,
			calldata: request.calldata,
			entrypoint: hash.getSelectorFromName(request.entry_point_selector),
		};
		const blockId = extractBlockId(block_id);
		return await starknet.callContract(call, blockId);
	},
	starknet_getEvents: async (params) => {
		const { filter } = params;
		return await starknet.getEvents({
			...filter,
			from_block: extractBlockId(filter.from_block),
			to_block: extractBlockId(filter.to_block),
		});
	},
	starknet_getNonce: async (params) => {
		const { block_id, contract_address } = params;
		const blockId = extractBlockId(block_id);
		return await starknet.getNonceForAddress(contract_address, blockId);
	},
	starknet_blockNumber: async (_params) => {
		return await starknet.getBlockNumber();
	},
	starknet_blockHashAndNumber: async (_params) => {
		return await starknet.getBlockLatestAccepted();
	},
	starknet_chainId: async (_params) => {
		return await starknet.getChainId();
	},
	starknet_syncing: async (_params) => {
		return await starknet.getSyncingStats();
	},
	starknet_specVersion: async (_params) => {
		return await starknet.getSpecVersion();
	},
};
