const path = require("node:path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PROTO_PATH = path.join(__dirname, "../../docs/protos/question.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const questionProto = grpc.loadPackageDefinition(packageDefinition).question;

const QUESTION_SERVICE_GRPC_URL = process.env.QUESTION_SERVICE_GRPC_URL || "localhost:50052";

const client = new questionProto.QuestionService(
  QUESTION_SERVICE_GRPC_URL,
  grpc.credentials.createInsecure()
);

function selectQuestions({ matiere, difficulte, nombre }) {
  return new Promise((resolve, reject) => {
    client.selectQuestions({ matiere, difficulte, nombre }, (error, response) => {
      if (error) return reject(error);
      resolve(response.questions);
    });
  });
}

module.exports = { selectQuestions };
