# assessment-service

## Responsabilité
- Création d'une évaluation à partir de la banque de questions
- Sélection manuelle ou génération automatique des questions
- Planification (dates de début/fin, durée, barème)
- Publication ou annulation
- Gestion des états : BROUILLON, PLANIFIÉE, PUBLIÉE, EN_COURS, TERMINÉE, CORRIGÉE

## Données possédées
- Evaluations (Write Model + Read Model, voir CQRS)

## Communication
- REST (CRUD évaluations, lecture des résultats)
- gRPC (appel sortant vers question-service pour la génération automatique)
- Messaging : publie `AssessmentPublished` et `AssessmentClosingSoon` ;
  consomme `GradingCompleted` et `ResultPublished` pour alimenter le Read Model des résultats

## Démarrage

```bash
npm install
npm start
```

- API REST : `http://localhost:3003` (port `PORT`, contrat dans
  `docs/openapi/assessment-service.yaml`)
- Nécessite `question-service` lancé pour la génération automatique
  (`QUESTION_SERVICE_GRPC_URL`, défaut `localhost:50052`)
- Stockage : en mémoire pour l'instant (pas de base de données branchée)

## État d'implémentation

- [x] CRUD REST (`GET/POST /assessments`, `GET/PUT /assessments/:id`)
- [x] Génération automatique via gRPC (`SelectQuestions`)
- [ ] Publication (`POST /assessments/:id/publish` + événement `AssessmentPublished`)
- [ ] Annulation (`POST /assessments/:id/cancel`)
- [ ] CQRS : séparation Write/Read Model, Event Store, `GET /assessments/:id/results`

Publication, CQRS et Event Sourcing : voir tâches assignées à Mouhamed
dans [`CONTRIBUTING.md`](../CONTRIBUTING.md).
