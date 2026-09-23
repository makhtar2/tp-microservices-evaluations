// Insère un jeu de questions de test varié (matière, chapitre, difficulté)
// pour pouvoir tester SelectQuestions de façon réaliste.
//
// Usage : node src/scripts/seed.js

require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('../models/Question');

const sampleQuestions = [
  {
    statement: 'Quel protocole est utilisé pour la communication synchrone REST entre microservices ?',
    type: 'QCM',
    subject: 'Systèmes distribués',
    chapter: 'REST',
    difficulty: 'FACILE',
    points: 2,
    answers: [
      { text: 'HTTP', isCorrect: true },
      { text: 'FTP', isCorrect: false },
    ],
  },
  {
    statement: 'gRPC utilise HTTP/2 comme protocole de transport.',
    type: 'VRAI_FAUX',
    subject: 'Systèmes distribués',
    chapter: 'gRPC',
    difficulty: 'FACILE',
    points: 1,
    answers: { correctAnswer: true },
  },
  {
    statement: 'Citez un broker de messages utilisable pour la communication asynchrone.',
    type: 'QUESTION_COURTE',
    subject: 'Systèmes distribués',
    chapter: 'Messaging',
    difficulty: 'MOYEN',
    points: 2,
    answers: { acceptedAnswers: ['RabbitMQ', 'Kafka'] },
  },
  {
    statement: 'Expliquez la différence entre communication synchrone et asynchrone entre microservices.',
    type: 'QUESTION_OUVERTE',
    subject: 'Systèmes distribués',
    chapter: 'Microservices',
    difficulty: 'MOYEN',
    points: 5,
    correction: 'Attendre : synchrone = appelant bloqué (REST/gRPC), asynchrone = via événements/broker.',
  },
  {
    statement: 'Dans une architecture microservices, chaque service doit posséder sa propre base de données.',
    type: 'VRAI_FAUX',
    subject: 'Systèmes distribués',
    chapter: 'Microservices',
    difficulty: 'MOYEN',
    points: 2,
    answers: { correctAnswer: true },
  },
  {
    statement: 'Le pattern Saga sert principalement à :',
    type: 'QCM',
    subject: 'Systèmes distribués',
    chapter: 'Microservices',
    difficulty: 'DIFFICILE',
    points: 3,
    answers: [
      { text: 'Gérer une transaction distribuée avec compensation', isCorrect: true },
      { text: 'Accélérer les requêtes REST', isCorrect: false },
      { text: 'Remplacer un API Gateway', isCorrect: false },
    ],
  },
  {
    statement: 'Expliquez le fonctionnement du CQRS combiné à l\'Event Sourcing.',
    type: 'QUESTION_OUVERTE',
    subject: 'Systèmes distribués',
    chapter: 'Microservices',
    difficulty: 'DIFFICILE',
    points: 5,
    correction: 'Attendre : séparation des modèles lecture/écriture, état reconstruit à partir du flux d\'événements.',
  },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[seed] Connecté à MongoDB');

  await Question.deleteMany({ subject: 'Systèmes distribués' });
  const created = await Question.insertMany(sampleQuestions);

  console.log(`[seed] ${created.length} questions insérées.`);
  await mongoose.disconnect();
})();
