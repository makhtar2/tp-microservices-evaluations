const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { selectQuestions } = require('./selectQuestions');

const PROTO_PATH = path.join(__dirname, 'question.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const questionProto = grpc.loadPackageDefinition(packageDefinition).question;

function toQuestionSummary(doc) {
  return {
    id: doc._id.toString(),
    statement: doc.statement,
    type: doc.type,
    subject: doc.subject,
    chapter: doc.chapter,
    difficulty: doc.difficulty,
    points: doc.points,
  };
}

async function SelectQuestions(call, callback) {
  try {
    const { subject, count, difficulty, themes } = call.request;

    // proto-loader (keepCase:false) convertit les champs snake_case du .proto
    // en camelCase côté JS : easy_percent -> easyPercent, etc.
    const { questions, fullySatisfied } = await selectQuestions({
      subject,
      count,
      difficulty: {
        easyPercent: difficulty?.easyPercent,
        mediumPercent: difficulty?.mediumPercent,
        hardPercent: difficulty?.hardPercent,
      },
      themes,
    });

    callback(null, {
      questions: questions.map(toQuestionSummary),
      fullySatisfied,
    });
  } catch (err) {
    callback(err);
  }
}

function startGrpcServer(port) {
  const server = new grpc.Server();
  server.addService(questionProto.QuestionService.service, { SelectQuestions });
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) {
      console.error('[question-service] Erreur au démarrage du serveur gRPC :', err.message);
      return;
    }
    console.log(`[question-service] gRPC server sur le port ${port}`);
  });
  return server;
}

module.exports = startGrpcServer;
