import * as node_src_proto_rpc_pb from './rpc_pb.js';

function serialize_drp_node_GetDRPHashGraphRequest(arg) {
  let encoded =
    node_src_proto_rpc_pb.GetDRPHashGraphRequest.encode(arg).finish();
  return Buffer.from(encoded);
}

function deserialize_drp_node_GetDRPHashGraphRequest(buffer_arg) {
  return node_src_proto_rpc_pb.GetDRPHashGraphRequest.decode(
    new Uint8Array(buffer_arg)
  );
}

function serialize_drp_node_GetDRPHashGraphResponse(arg) {
  let encoded =
    node_src_proto_rpc_pb.GetDRPHashGraphResponse.encode(arg).finish();
  return Buffer.from(encoded);
}

function deserialize_drp_node_GetDRPHashGraphResponse(buffer_arg) {
  return node_src_proto_rpc_pb.GetDRPHashGraphResponse.decode(
    new Uint8Array(buffer_arg)
  );
}

function serialize_drp_node_SubscribeDRPRequest(arg) {
  let encoded = node_src_proto_rpc_pb.SubscribeDRPRequest.encode(arg).finish();
  return Buffer.from(encoded);
}

function deserialize_drp_node_SubscribeDRPRequest(buffer_arg) {
  return node_src_proto_rpc_pb.SubscribeDRPRequest.decode(
    new Uint8Array(buffer_arg)
  );
}

function serialize_drp_node_SubscribeDRPResponse(arg) {
  let encoded = node_src_proto_rpc_pb.SubscribeDRPResponse.encode(arg).finish();
  return Buffer.from(encoded);
}

function deserialize_drp_node_SubscribeDRPResponse(buffer_arg) {
  return node_src_proto_rpc_pb.SubscribeDRPResponse.decode(
    new Uint8Array(buffer_arg)
  );
}

function serialize_drp_node_UnsubscribeDRPRequest(arg) {
  let encoded =
    node_src_proto_rpc_pb.UnsubscribeDRPRequest.encode(arg).finish();
  return Buffer.from(encoded);
}

function deserialize_drp_node_UnsubscribeDRPRequest(buffer_arg) {
  return node_src_proto_rpc_pb.UnsubscribeDRPRequest.decode(
    new Uint8Array(buffer_arg)
  );
}

function serialize_drp_node_UnsubscribeDRPResponse(arg) {
  let encoded =
    node_src_proto_rpc_pb.UnsubscribeDRPResponse.encode(arg).finish();
  return Buffer.from(encoded);
}

function deserialize_drp_node_UnsubscribeDRPResponse(buffer_arg) {
  return node_src_proto_rpc_pb.UnsubscribeDRPResponse.decode(
    new Uint8Array(buffer_arg)
  );
}

export const DRPRpcService = {
  subscribeDRP: {
    path: '/drp.node.v1.DrpRpcService/SubscribeDRP',
    requestStream: false,
    responseStream: false,
    requestType: node_src_proto_rpc_pb.SubscribeDRPRequest,
    responseType: node_src_proto_rpc_pb.SubscribeDRPResponse,
    requestSerialize: serialize_drp_node_SubscribeDRPRequest,
    requestDeserialize: deserialize_drp_node_SubscribeDRPRequest,
    responseSerialize: serialize_drp_node_SubscribeDRPResponse,
    responseDeserialize: deserialize_drp_node_SubscribeDRPResponse,
  },
  unsubscribeDRP: {
    path: '/drp.node.v1.DrpRpcService/UnsubscribeDRP',
    requestStream: false,
    responseStream: false,
    requestType: node_src_proto_rpc_pb.UnsubscribeDRPRequest,
    responseType: node_src_proto_rpc_pb.UnsubscribeDRPResponse,
    requestSerialize: serialize_drp_node_UnsubscribeDRPRequest,
    requestDeserialize: deserialize_drp_node_UnsubscribeDRPRequest,
    responseSerialize: serialize_drp_node_UnsubscribeDRPResponse,
    responseDeserialize: deserialize_drp_node_UnsubscribeDRPResponse,
  },
  getDRPHashGraph: {
    path: '/drp.node.v1.DrpRpcService/GetDRPHashGraph',
    requestStream: false,
    responseStream: false,
    requestType: node_src_proto_rpc_pb.GetDRPHashGraphRequest,
    responseType: node_src_proto_rpc_pb.GetDRPHashGraphResponse,
    requestSerialize: serialize_drp_node_GetDRPHashGraphRequest,
    requestDeserialize: deserialize_drp_node_GetDRPHashGraphRequest,
    responseSerialize: serialize_drp_node_GetDRPHashGraphResponse,
    responseDeserialize: deserialize_drp_node_GetDRPHashGraphResponse,
  },
};
