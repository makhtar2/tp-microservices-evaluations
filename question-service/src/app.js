const express = require('express');
const cors = require('cors');
const questionRoutes = require('./routes/questionRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'question-service' }));
app.use('/api/questions', questionRoutes);

// Gestion d'erreur générique
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du service' });
});

module.exports = app;
