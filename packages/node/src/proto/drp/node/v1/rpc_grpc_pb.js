// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var drp_node_v1_rpc_pb = require('../../../drp/node/v1/rpc_pb.js');

function serialize_drp_node_v1_AddCustomGroupRequest(arg) {
  if (!(arg instanceof drp_node_v1_rpc_pb.AddCustomGroupRequest)) {
    throw new Error('Expected argument of type drp.node.v1.AddCustomGroupRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_drp_node_v1_AddCustomGroupRequest(buffer_arg) {
  return drp_node_v1_rpc_pb.AddCustomGroupRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_drp_node_v1_GenericRespone(arg) {
  if (!(arg instanceof drp_node_v1_rpc_pb.GenericRespone)) {
    throw new Error('Expected argument of type drp.node.v1.GenericRespone');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_drp_node_v1_GenericRespone(buffer_arg) {
  return drp_node_v1_rpc_pb.GenericRespone.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_drp_node_v1_GetDRPHashGraphRequest(arg) {
  if (!(arg instanceof drp_node_v1_rpc_pb.GetDRPHashGraphRequest)) {
    throw new Error('Expected argument of type drp.node.v1.GetDRPHashGraphRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_drp_node_v1_GetDRPHashGraphRequest(buffer_arg) {
  return drp_node_v1_rpc_pb.GetDRPHashGraphRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_drp_node_v1_GetDRPHashGraphResponse(arg) {
  if (!(arg instanceof drp_node_v1_rpc_pb.GetDRPHashGraphResponse)) {
    throw new Error('Expected argument of type drp.node.v1.GetDRPHashGraphResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_drp_node_v1_GetDRPHashGraphResponse(buffer_arg) {
  return drp_node_v1_rpc_pb.GetDRPHashGraphResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_drp_node_v1_SendCustomMessageRequest(arg) {
  if (!(arg instanceof drp_node_v1_rpc_pb.SendCustomMessageRequest)) {
    throw new Error('Expected argument of type drp.node.v1.SendCustomMessageRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_drp_node_v1_SendCustomMessageRequest(buffer_arg) {
  return drp_node_v1_rpc_pb.SendCustomMessageRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_drp_node_v1_SendGroupMessageRequest(arg) {
  if (!(arg instanceof drp_node_v1_rpc_pb.SendGroupMessageRequest)) {
    throw new Error('Expected argument of type drp.node.v1.SendGroupMessageRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_drp_node_v1_SendGroupMessageRequest(buffer_arg) {
  return drp_node_v1_rpc_pb.SendGroupMessageRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_drp_node_v1_SubscribeDRPRequest(arg) {
  if (!(arg instanceof drp_node_v1_rpc_pb.SubscribeDRPRequest)) {
    throw new Error('Expected argument of type drp.node.v1.SubscribeDRPRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_drp_node_v1_SubscribeDRPRequest(buffer_arg) {
  return drp_node_v1_rpc_pb.SubscribeDRPRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_drp_node_v1_SyncDRPObjectRequest(arg) {
  if (!(arg instanceof drp_node_v1_rpc_pb.SyncDRPObjectRequest)) {
    throw new Error('Expected argument of type drp.node.v1.SyncDRPObjectRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_drp_node_v1_SyncDRPObjectRequest(buffer_arg) {
  return drp_node_v1_rpc_pb.SyncDRPObjectRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_drp_node_v1_UnsubscribeDRPRequest(arg) {
  if (!(arg instanceof drp_node_v1_rpc_pb.UnsubscribeDRPRequest)) {
    throw new Error('Expected argument of type drp.node.v1.UnsubscribeDRPRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_drp_node_v1_UnsubscribeDRPRequest(buffer_arg) {
  return drp_node_v1_rpc_pb.UnsubscribeDRPRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var DrpRpcServiceService = exports.DrpRpcServiceService = {
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

exports.DrpRpcServiceClient = grpc.makeGenericClientConstructor(DrpRpcServiceService);
