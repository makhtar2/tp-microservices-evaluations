# question-service

## Responsabilité
- Constitution de la banque de questions (créer, modifier, supprimer, consulter)
- Recherche et filtrage des questions
- Association d'une correction à chaque question
- Sélection de questions selon des critères (matière, difficulté, thème)
  pour la génération automatique d'une évaluation

## Données possédées
- Questions (énoncé, type, matière, chapitre, difficulté, points, réponses, correction)

## Communication
- REST : CRUD banque de questions, préfixe `/api/questions`
  (contrat dans `docs/openapi/question-service.yaml`)
- gRPC : `SelectQuestions(subject, count, difficulty, themes)` appelé par
  `assessment-service` (contrat dans `docs/protos/question.proto`)

## Démarrage

```bash
cp .env.example .env   # ajuster MONGO_URI si besoin
npm install
npm start
```

- API REST : `http://localhost:3002/api` (port `PORT`)
- Serveur gRPC : `localhost:50052` (port `GRPC_PORT`)
- Health check : `GET /health`
- Stockage : MongoDB (`MONGO_URI`, mongoose)
- Jeu de données de test : `node src/scripts/seed.js`
- Test manuel du gRPC sans assessment-service : `node src/scripts/testSelectQuestions.js`

## Règles métier appliquées
- Suppression douce : `DELETE /api/questions/:id` passe `active` à `false`
  plutôt que de supprimer le document, pour rester consultable dans les
  évaluations passées (pas de suppression en cascade). `GET /api/questions`
  ne retourne que les questions actives sauf `includeInactive=true`.
- La sélection automatique (`SelectQuestions`) ignore les questions inactives.

## État d'implémentation

- [x] CRUD REST (`GET/POST /questions`, `GET/PUT/DELETE /questions/:id`)
- [x] Endpoint gRPC `SelectQuestions` avec répartition par difficulté
- [x] Persistance MongoDB
- [x] Dockerfile
