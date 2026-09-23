const path = require("node:path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const store = require("./store");

const PROTO_PATH = path.join(__dirname, "../../docs/protos/question.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const questionProto = grpc.loadPackageDefinition(packageDefinition).question;

function selectQuestions(call, callback) {
  const { matiere, difficulte, nombre } = call.request;
  const questions = store.selectByCriteria({ matiere, difficulte, nombre });
  callback(null, { questions });
}

function createGrpcServer() {
  const server = new grpc.Server();
  server.addService(questionProto.QuestionService.service, { selectQuestions });
  return server;
}

module.exports = { createGrpcServer };
