// GENERATED CODE -- DO NOT EDIT!
import * as drp_node_v1_rpc_pb from './rpc_pb.ts';

function serialize_drp_node_v1_AddCustomGroupRequest(arg) {
  const encoded = drp_node_v1_rpc_pb.AddCustomGroupRequest.encode(arg).finish();
  return Buffer.from(encoded);
}

function deserialize_drp_node_v1_AddCustomGroupRequest(buffer_arg) {
  return drp_node_v1_rpc_pb.AddCustomGroupRequest.decode(
    new Uint8Array(buffer_arg)
  );
}

function serialize_drp_node_v1_GenericRespone(arg) {
  const encoded = drp_node_v1_rpc_pb.GenericRespone.encode(arg).finish();
  return Buffer.from(encoded);
}

function deserialize_drp_node_v1_GenericRespone(buffer_arg) {
  return drp_node_v1_rpc_pb.GenericRespone.decode(new Uint8Array(buffer_arg));
}

function serialize_drp_node_v1_GetDRPHashGraphRequest(arg) {
  const encoded =
    drp_node_v1_rpc_pb.GetDRPHashGraphRequest.encode(arg).finish();
  return Buffer.from(encoded);
}

function deserialize_drp_node_v1_GetDRPHashGraphRequest(buffer_arg) {
  return drp_node_v1_rpc_pb.GetDRPHashGraphRequest.decode(
    new Uint8Array(buffer_arg)
  );
}

function serialize_drp_node_v1_GetDRPHashGraphResponse(arg) {
  const encoded =
    drp_node_v1_rpc_pb.GetDRPHashGraphResponse.encode(arg).finish();
  return Buffer.from(encoded);
}

function deserialize_drp_node_v1_GetDRPHashGraphResponse(buffer_arg) {
  return drp_node_v1_rpc_pb.GetDRPHashGraphResponse.decode(
    new Uint8Array(buffer_arg)
  );
}

function serialize_drp_node_v1_SendCustomMessageRequest(arg) {
  const encoded =
    drp_node_v1_rpc_pb.SendCustomMessageRequest.encode(arg).finish();
  return Buffer.from(encoded);
}

function deserialize_drp_node_v1_SendCustomMessageRequest(buffer_arg) {
  return drp_node_v1_rpc_pb.SendCustomMessageRequest.decode(
    new Uint8Array(buffer_arg)
  );
}

function serialize_drp_node_v1_SendGroupMessageRequest(arg) {
  const encoded =
    drp_node_v1_rpc_pb.SendGroupMessageRequest.encode(arg).finish();
  return Buffer.from(encoded);
}

function deserialize_drp_node_v1_SendGroupMessageRequest(buffer_arg) {
  return drp_node_v1_rpc_pb.SendGroupMessageRequest.decode(
    new Uint8Array(buffer_arg)
  );
}

function serialize_drp_node_v1_SubscribeDRPRequest(arg) {
  const encoded = drp_node_v1_rpc_pb.SubscribeDRPRequest.encode(arg).finish();
  return Buffer.from(encoded);
}

function deserialize_drp_node_v1_SubscribeDRPRequest(buffer_arg) {
  return drp_node_v1_rpc_pb.SubscribeDRPRequest.decode(
    new Uint8Array(buffer_arg)
  );
}

function serialize_drp_node_v1_SyncDRPObjectRequest(arg) {
  const encoded = drp_node_v1_rpc_pb.SyncDRPObjectRequest.encode(arg).finish();
  return Buffer.from(encoded);
}

function deserialize_drp_node_v1_SyncDRPObjectRequest(buffer_arg) {
  return drp_node_v1_rpc_pb.SyncDRPObjectRequest.decode(
    new Uint8Array(buffer_arg)
  );
}

function serialize_drp_node_v1_UnsubscribeDRPRequest(arg) {
  const encoded = drp_node_v1_rpc_pb.UnsubscribeDRPRequest.encode(arg).finish();
  return Buffer.from(encoded);
}

function deserialize_drp_node_v1_UnsubscribeDRPRequest(buffer_arg) {
  return drp_node_v1_rpc_pb.UnsubscribeDRPRequest.decode(
    new Uint8Array(buffer_arg)
  );
}

export const DrpRpcService = {
  subscribeDRP: {
    path: '/drp.node.v1.DrpRpcService/SubscribeDRP',
    requestStream: false,
    responseStream: false,
    requestType: drp_node_v1_rpc_pb.SubscribeDRPRequest,
    responseType: drp_node_v1_rpc_pb.GenericRespone,
    requestSerialize: serialize_drp_node_v1_SubscribeDRPRequest,
    requestDeserialize: deserialize_drp_node_v1_SubscribeDRPRequest,
    responseSerialize: serialize_drp_node_v1_GenericRespone,
    responseDeserialize: deserialize_drp_node_v1_GenericRespone,
  },
  unsubscribeDRP: {
    path: '/drp.node.v1.DrpRpcService/UnsubscribeDRP',
    requestStream: false,
    responseStream: false,
    requestType: drp_node_v1_rpc_pb.UnsubscribeDRPRequest,
    responseType: drp_node_v1_rpc_pb.GenericRespone,
    requestSerialize: serialize_drp_node_v1_UnsubscribeDRPRequest,
    requestDeserialize: deserialize_drp_node_v1_UnsubscribeDRPRequest,
    responseSerialize: serialize_drp_node_v1_GenericRespone,
    responseDeserialize: deserialize_drp_node_v1_GenericRespone,
  },
  getDRPHashGraph: {
    path: '/drp.node.v1.DrpRpcService/GetDRPHashGraph',
    requestStream: false,
    responseStream: false,
    requestType: drp_node_v1_rpc_pb.GetDRPHashGraphRequest,
    responseType: drp_node_v1_rpc_pb.GetDRPHashGraphResponse,
    requestSerialize: serialize_drp_node_v1_GetDRPHashGraphRequest,
    requestDeserialize: deserialize_drp_node_v1_GetDRPHashGraphRequest,
    responseSerialize: serialize_drp_node_v1_GetDRPHashGraphResponse,
    responseDeserialize: deserialize_drp_node_v1_GetDRPHashGraphResponse,
  },
  syncDRPObject: {
    path: '/drp.node.v1.DrpRpcService/SyncDRPObject',
    requestStream: false,
    responseStream: false,
    requestType: drp_node_v1_rpc_pb.SyncDRPObjectRequest,
    responseType: drp_node_v1_rpc_pb.GenericRespone,
    requestSerialize: serialize_drp_node_v1_SyncDRPObjectRequest,
    requestDeserialize: deserialize_drp_node_v1_SyncDRPObjectRequest,
    responseSerialize: serialize_drp_node_v1_GenericRespone,
    responseDeserialize: deserialize_drp_node_v1_GenericRespone,
  },
  sendCustomMessage: {
    path: '/drp.node.v1.DrpRpcService/SendCustomMessage',
    requestStream: false,
    responseStream: false,
    requestType: drp_node_v1_rpc_pb.SendCustomMessageRequest,
    responseType: drp_node_v1_rpc_pb.GenericRespone,
    requestSerialize: serialize_drp_node_v1_SendCustomMessageRequest,
    requestDeserialize: deserialize_drp_node_v1_SendCustomMessageRequest,
    responseSerialize: serialize_drp_node_v1_GenericRespone,
    responseDeserialize: deserialize_drp_node_v1_GenericRespone,
  },
  sendGroupMessage: {
    path: '/drp.node.v1.DrpRpcService/SendGroupMessage',
    requestStream: false,
    responseStream: false,
    requestType: drp_node_v1_rpc_pb.SendGroupMessageRequest,
    responseType: drp_node_v1_rpc_pb.GenericRespone,
    requestSerialize: serialize_drp_node_v1_SendGroupMessageRequest,
    requestDeserialize: deserialize_drp_node_v1_SendGroupMessageRequest,
    responseSerialize: serialize_drp_node_v1_GenericRespone,
    responseDeserialize: deserialize_drp_node_v1_GenericRespone,
  },
  addCustomGroup: {
    path: '/drp.node.v1.DrpRpcService/AddCustomGroup',
    requestStream: false,
    responseStream: false,
    requestType: drp_node_v1_rpc_pb.AddCustomGroupRequest,
    responseType: drp_node_v1_rpc_pb.GenericRespone,
    requestSerialize: serialize_drp_node_v1_AddCustomGroupRequest,
    requestDeserialize: deserialize_drp_node_v1_AddCustomGroupRequest,
    responseSerialize: serialize_drp_node_v1_GenericRespone,
    responseDeserialize: deserialize_drp_node_v1_GenericRespone,
  },
};
