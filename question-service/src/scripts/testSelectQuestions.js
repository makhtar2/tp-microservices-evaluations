// Petit client gRPC pour tester SelectQuestions manuellement,
// sans dépendre d'assessment-service.
//
// Usage : node src/scripts/testSelectQuestions.js

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, '../../../docs/protos/question.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const questionProto = grpc.loadPackageDefinition(packageDefinition).question;

const client = new questionProto.QuestionService(
  process.env.GRPC_TARGET || 'localhost:50052',
  grpc.credentials.createInsecure()
);

const request = {
  subject: 'Systèmes distribués',
  count: 5,
  difficulty: {
    easyPercent: 30,
    mediumPercent: 50,
    hardPercent: 20,
  },
  themes: ['Microservices', 'REST', 'gRPC', 'Messaging'],
};

client.SelectQuestions(request, (err, response) => {
  if (err) {
    console.error('Erreur gRPC :', err.message);
    process.exit(1);
  }
  console.log(`fullySatisfied: ${response.fullySatisfied}`);
  console.log(`Nombre de questions retournées: ${response.questions.length}`);
  response.questions.forEach((q) => {
    console.log(`  [${q.difficulty}] (${q.chapter}) ${q.statement}`);
  });
});
