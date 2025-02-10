/* eslint-disable @typescript-eslint/no-explicit-any */
// Claude generated Zod schemas for Starknet RPC methods
// starknet_estimateFee and starknet_estimateMessageFee are not supported

import { z, ZodSchema } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const FELT = z.string().regex(/^0x(0|[a-fA-F1-9]{1}[a-fA-F0-9]{0,62})$/);
const ADDRESS = FELT;
const BLOCK_HASH = FELT;

// accepting string as block number because Claude likes to send it that way
const BLOCK_NUMBER = z.union([
	z.number().int().min(0),
	z
		.string()
		.regex(/^\d+$/)
		.transform((val: any) => parseInt(val, 10)),
]);
const BLOCK_TAG = z.enum(["latest", "pending"]);

// Block ID can be one of three types,
// but Claude prefers sending either an empty object
// or everything as a string
export const BLOCK_ID = z
	.union([
		z.object({ block_hash: BLOCK_HASH }),
		z.object({ block_number: BLOCK_NUMBER }),
		BLOCK_TAG,
		z.object({}).transform(() => "latest"), // for Claude
	])
	.default("latest");

// Transaction hash schema
const TXN_HASH = FELT;

// Storage key schema
const STORAGE_KEY = z.string().regex(/^0x(0|[0-7]{1}[a-fA-F0-9]{0,62}$)/);

// Event filter schema
const EVENT_FILTER = z
	.object({
		from_block: BLOCK_ID,
		to_block: BLOCK_ID,
		address: ADDRESS.optional(),
		keys: z.array(z.array(FELT)).optional(),
	})
	.and(
		z.object({
			chunk_size: z.number().int().min(1),
			continuation_token: z.string().optional(),
		})
	);

// Function call schema
const FUNCTION_CALL = z.object({
	contract_address: ADDRESS,
	entry_point_selector: z.string(), // selector hashing is done in the handler
	calldata: z.array(FELT),
});

// Message from L1 schema
// const MSG_FROM_L1 = z.object({
//     from_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
//     to_address: ADDRESS,
//     entry_point_selector: FELT,
//     payload: z.array(FELT),
// });

// Simulation flags
// const SIMULATION_FLAG = z.enum(["SKIP_VALIDATE"]);

// Resource bounds
// const RESOURCE_BOUNDS = z.object({
//     max_amount: z.string(),
//     max_price_per_unit: z.string(),
// });

// const RESOURCE_BOUNDS_MAPPING = z.object({
//     l1_gas: RESOURCE_BOUNDS,
//     l2_gas: RESOURCE_BOUNDS,
// });

// Now let's define our request schemas

// These methods require a block_id
export const GetBlockWithTxHashesRequestSchema = BLOCK_ID;
export const GetBlockWithTxsRequestSchema = BLOCK_ID;
export const GetBlockWithReceiptsRequestSchema = BLOCK_ID;
export const GetStateUpdateRequestSchema = BLOCK_ID;
export const GetBlockTransactionCountRequestSchema = BLOCK_ID;

// These methods have block_id with default 'latest'
export const GetStorageAtRequestSchema = z.object({
	contract_address: ADDRESS,
	key: STORAGE_KEY,
	block_id: BLOCK_ID,
});

export const GetClassRequestSchema = z.object({
	block_id: BLOCK_ID,
	class_hash: FELT,
});

export const GetClassHashAtRequestSchema = z.object({
	block_id: BLOCK_ID,
	contract_address: ADDRESS,
});

export const GetClassAtRequestSchema = z.object({
	block_id: BLOCK_ID,
	contract_address: ADDRESS,
});

export const CallRequestSchema = z.object({
	request: FUNCTION_CALL,
	block_id: BLOCK_ID,
});

// export const EstimateFeeRequestSchema = z.object({
//     request: z.array(z.any()), // This would need to be expanded based on your needs
//     simulation_flags: z.array(SIMULATION_FLAG),
//     block_id: BLOCK_ID_WITH_DEFAULT,
// });

// export const EstimateMessageFeeRequestSchema = z.object({
//     message: MSG_FROM_L1,
//     block_id: BLOCK_ID_WITH_DEFAULT,
// });

export const GetNonceRequestSchema = z.object({
	block_id: BLOCK_ID,
	contract_address: ADDRESS,
});

// Methods that don't use block_id
export const GetTransactionStatusRequestSchema = z.object({
	transaction_hash: TXN_HASH,
});

export const GetTransactionByHashRequestSchema = z.object({
	transaction_hash: TXN_HASH,
});

export const GetTransactionByBlockIdAndIndexRequestSchema = z.object({
	block_id: BLOCK_ID, // Required here as it's part of transaction identification
	index: z.number().int().min(0),
});

export const GetTransactionReceiptRequestSchema = z.object({
	transaction_hash: TXN_HASH,
});

export const GetEventsRequestSchema = EVENT_FILTER;

// No params needed for these methods
export const BlockNumberRequestSchema = z.object({});
export const BlockHashAndNumberRequestSchema = z.object({});
export const ChainIdRequestSchema = z.object({});
export const SyncingRequestSchema = z.object({});
export const SpecVersionRequestSchema = z.object({});

// Export a map of method names to their schemas for easier lookup
export const RpcMethodSchemas = {
	starknet_getBlockWithTxHashes: GetBlockWithTxHashesRequestSchema,
	starknet_getBlockWithTxs: GetBlockWithTxsRequestSchema,
	starknet_getBlockWithReceipts: GetBlockWithReceiptsRequestSchema,
	starknet_getStateUpdate: GetStateUpdateRequestSchema,
	starknet_getStorageAt: GetStorageAtRequestSchema,
	starknet_getTransactionStatus: GetTransactionStatusRequestSchema,
	starknet_getTransactionByHash: GetTransactionByHashRequestSchema,
	starknet_getTransactionByBlockIdAndIndex: GetTransactionByBlockIdAndIndexRequestSchema,
	starknet_getTransactionReceipt: GetTransactionReceiptRequestSchema,
	starknet_getClass: GetClassRequestSchema,
	starknet_getClassHashAt: GetClassHashAtRequestSchema,
	starknet_getClassAt: GetClassAtRequestSchema,
	starknet_getBlockTransactionCount: GetBlockTransactionCountRequestSchema,
	starknet_call: CallRequestSchema,
	// "starknet_estimateFee": EstimateFeeRequestSchema,
	// "starknet_estimateMessageFee": EstimateMessageFeeRequestSchema,
	starknet_getEvents: GetEventsRequestSchema,
	starknet_getNonce: GetNonceRequestSchema,
	starknet_blockNumber: BlockNumberRequestSchema,
	starknet_blockHashAndNumber: BlockHashAndNumberRequestSchema,
	starknet_chainId: ChainIdRequestSchema,
	starknet_syncing: SyncingRequestSchema,
	starknet_specVersion: SpecVersionRequestSchema,
} as const;

// Type helper to get the schema type for a method
export type RpcMethodSchemaType = typeof RpcMethodSchemas;
export type RpcMethodName = keyof RpcMethodSchemaType;

// Helper function to get a schema for a method
export function getRpcMethodSchema(method: RpcMethodName) {
	return RpcMethodSchemas[method];
}

// Helper function to validate parameters for a method
export function validateRpcMethodParams(method: RpcMethodName, params: unknown) {
	const schema = getRpcMethodSchema(method);
	return schema.parse(params);
}

export function toJsonSchema(zodSchema: ZodSchema<any>) {
	const schema = zodToJsonSchema(zodSchema, {
		$refStrategy: "none",
	});

	// zodToJsonSchema sometimes omits "type" in its output, but
	// the MCP implementation expects it to be there, so we add
	// it manually it's not present
	if ("type" in schema === false) {
		(schema as any).type = "object";
	}

	return schema;
}
