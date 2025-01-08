import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as reflection from "@grpc/reflection";

import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import { type DRPNode, log } from "../index.js";
import { DrpRpcServiceService } from "../proto/drp/node/v1/rpc_grpc_pb.js";
import type {
	AddCustomGroupRequest,
	GenericRespone,
	GetDRPHashGraphRequest,
	GetDRPHashGraphResponse,
	SendCustomMessageRequest,
	SendGroupMessageRequest,
	SubscribeDRPRequest,
	UnsubscribeDRPRequest,
} from "../proto/drp/node/v1/rpc_pb.js";

export function init(node: DRPNode) {
	function subscribeDRP(
		call: ServerUnaryCall<SubscribeDRPRequest, GenericRespone>,
		callback: sendUnaryData<GenericRespone>,
	) {
		let returnCode = 0;
		try {
			node.subscribeObject(call.request.drpId);
		} catch (e) {
			log.error("::rpc::subscribeDRP: Error", e);
			returnCode = 1;
		}

		const response: GenericRespone = {
			returnCode,
		};
		callback(null, response);
	}

	function unsubscribeDRP(
		call: ServerUnaryCall<UnsubscribeDRPRequest, GenericRespone>,
		callback: sendUnaryData<GenericRespone>,
	) {
		let returnCode = 0;
		try {
			node.unsubscribeObject(call.request.drpId);
		} catch (e) {
			log.error("::rpc::unsubscribeDRP: Error", e);
			returnCode = 1;
		}

		const response: GenericRespone = {
			returnCode,
		};
		callback(null, response);
	}

	function getDRPHashGraph(
		call: ServerUnaryCall<GetDRPHashGraphRequest, GetDRPHashGraphResponse>,
		callback: sendUnaryData<GetDRPHashGraphResponse>,
	) {
		const hashes: string[] = [];
		try {
			const object = node.objectStore.get(call.request.drpId);
			if (!object) throw Error("drp not found");
			for (const v of object.hashGraph.getAllVertices()) {
				hashes.push(v.hash);
			}
		} catch (e) {
			log.error("::rpc::getDRPHashGraph: Error", e);
		}

		const response: GetDRPHashGraphResponse = {
			verticesHashes: hashes,
		};
		callback(null, response);
	}

	function syncDRPObject(
		call: ServerUnaryCall<SubscribeDRPRequest, GenericRespone>,
		callback: sendUnaryData<GenericRespone>,
	) {
		let returnCode = 0;
		try {
			node.syncObject(call.request.drpId);
		} catch (e) {
			log.error("::rpc::syncDRPObject: Error", e);
			returnCode = 1;
		}

		const response: GenericRespone = {
			returnCode,
		};
		callback(null, response);
	}

	function sendCustomMessage(
		call: ServerUnaryCall<SendCustomMessageRequest, GenericRespone>,
		callback: sendUnaryData<GenericRespone>,
	) {
		let returnCode = 0;
		try {
			node.sendCustomMessage(
				call.request.peerId,
				call.request.protocol,
				call.request.data,
			);
		} catch (e) {
			log.error("::rpc::sendCustomMessage: Error", e);
			returnCode = 1;
		}

		const response: GenericRespone = {
			returnCode,
		};
		callback(null, response);
	}

	function sendGroupMessage(
		call: ServerUnaryCall<SendGroupMessageRequest, GenericRespone>,
		callback: sendUnaryData<GenericRespone>,
	) {
		let returnCode = 0;
		try {
			node.sendGroupMessage(call.request.group, call.request.data);
		} catch (e) {
			log.error("::rpc::sendGroupMessage: Error", e);
			returnCode = 1;
		}

		const response: GenericRespone = {
			returnCode,
		};
		callback(null, response);
	}

	function addCustomGroup(
		call: ServerUnaryCall<AddCustomGroupRequest, GenericRespone>,
		callback: sendUnaryData<GenericRespone>,
	) {
		let returnCode = 0;
		try {
			node.addCustomGroup(call.request.group);
		} catch (e) {
			log.error("::rpc::addCustomGroup: Error", e);
			returnCode = 1;
		}

		const response: GenericRespone = {
			returnCode,
		};
		callback(null, response);
	}

	const protoPath = path.resolve(
		dirname(fileURLToPath(import.meta.url)),
		"../proto/drp/node/v1/rpc.proto",
	);
	const packageDefinition = protoLoader.loadSync(protoPath);
	const reflectionService = new reflection.ReflectionService(packageDefinition);

	const server = new grpc.Server();
	reflectionService.addToServer(server);
	server.addService(DrpRpcServiceService, {
		subscribeDRP,
		unsubscribeDRP,
		getDRPHashGraph,
		syncDRPObject,
		sendCustomMessage,
		sendGroupMessage,
		addCustomGroup,
	});
	server.bindAsync(
		"0.0.0.0:6969",
		grpc.ServerCredentials.createInsecure(),
		(_error, _port) => {
			log.info("::rpc::init: running grpc in port:", _port);
		},
	);
}
