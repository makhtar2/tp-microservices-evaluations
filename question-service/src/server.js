require('dotenv').config();

const connectDB = require('./config/db');
const app = require('./app');
const startGrpcServer = require('./grpc/grpcServer');

const PORT = process.env.PORT || 3001;
const GRPC_PORT = process.env.GRPC_PORT || 50051;

(async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[question-service] REST API sur le port ${PORT}`);
  });

  startGrpcServer(GRPC_PORT);
})();
