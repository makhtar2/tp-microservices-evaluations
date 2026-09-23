const grpc = require("@grpc/grpc-js");
const app = require("./app");
const { createGrpcServer } = require("./grpc");

const REST_PORT = process.env.PORT || 3002;
const GRPC_PORT = process.env.GRPC_PORT || 50052;

app.listen(REST_PORT, () => {
  console.log(`question-service REST à l'écoute sur le port ${REST_PORT}`);
});

const grpcServer = createGrpcServer();
grpcServer.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), () => {
  console.log(`question-service gRPC à l'écoute sur le port ${GRPC_PORT}`);
});
