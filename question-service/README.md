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
- REST (CRUD banque de questions)
- gRPC : `SelectQuestions(matiere, difficulte, nombre)` appelé par assessment-service

## Démarrage

```bash
npm install
npm start
```

- API REST : `http://localhost:3002` (port `PORT`, contrat dans
  `docs/openapi/question-service.yaml`)
- Serveur gRPC : `localhost:50052` (port `GRPC_PORT`, contrat dans
  `docs/protos/question.proto`)
- Stockage : en mémoire pour l'instant (pas de base de données branchée)

## État d'implémentation

- [x] CRUD REST (`GET/POST /questions`, `GET/PUT/DELETE /questions/:id`)
- [x] Endpoint gRPC `SelectQuestions`
- [ ] Persistance (base de données)
