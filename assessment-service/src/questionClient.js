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

function selectQuestions({ matiere, nombre, repartitionDifficulte, themes }) {
  const request = {
    subject: matiere,
    count: nombre,
    difficulty: {
      easyPercent: repartitionDifficulte?.facile ?? 0,
      mediumPercent: repartitionDifficulte?.moyen ?? 0,
      hardPercent: repartitionDifficulte?.difficile ?? 0,
    },
    themes: themes || [],
  };

  return new Promise((resolve, reject) => {
    client.selectQuestions(request, (error, response) => {
      if (error) return reject(error);
      resolve({ questions: response.questions, fullySatisfied: response.fullySatisfied });
    });
  });
}

module.exports = { selectQuestions };
