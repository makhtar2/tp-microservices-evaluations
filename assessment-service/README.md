# assessment-service

## Responsabilité
- Création d'une évaluation à partir de la banque de questions
- Sélection manuelle ou génération automatique des questions
- Planification (dates de début/fin, durée, barème)
- Publication ou annulation
- Gestion des états : BROUILLON, PLANIFIÉE, PUBLIÉE, EN_COURS, TERMINÉE, CORRIGÉE, ANNULÉE

## Données possédées
- Evaluations (Write Model + Read Model, CQRS + Event Sourcing)

## Communication
- REST (CRUD évaluations, lecture des résultats)
- gRPC (appel sortant vers question-service pour la génération automatique)
- Messaging (RabbitMQ, exchange topic `evaluations.events`) :
  publie `assessment.published` et `assessment.closing_soon` ;
  consomme `grading.completed` et `result.published` (publiés par
  grading-service) pour alimenter le Read Model des résultats

## CQRS + Event Sourcing

- **Write Model** (`src/commands.js`) : traite les commandes
  (`createAssessment`, `updateAssessment`, `publishAssessment`,
  `cancelAssessment`), valide les règles métier (ex. impossible de publier
  sans question ni barème total positif), et écrit dans l'Event Store.
- **Event Store** (`src/eventStore.js`, `src/models/AssessmentEvent.js`) :
  journal d'ajout seul des événements (`AssessmentCreated`,
  `AssessmentUpdated`, `AssessmentPublished`, `AssessmentCancelled`,
  `GradingCompleted`, `ResultPublished`), source de vérité.
- **Read Model** (`src/models/AssessmentReadModel.js`,
  `src/projections/projectAssessment.js`) : projection dérivée de l'Event
  Store, mise à jour à chaque événement (`src/projectionUpdater.js`) et
  entièrement reconstructible en rejouant l'historique
  (`POST /assessments/:id/rebuild`).
- **Queries** (`src/queries.js`) : lisent uniquement le Read Model
  (`GET /assessments`, `GET /assessments/:id`,
  `GET /assessments/:id/results`).

Un résultat individuel n'apparaît dans `resultatsEtudiants` /
`GET /assessments/:id/results` qu'après réception de l'événement
`result.published` pour cet étudiant (règle métier : jamais visible avant,
même si la correction automatique est terminée).

## Démarrage

```bash
cp .env.example .env   # ajuster MONGO_URI / RABBITMQ_URL si besoin
npm install
npm start
```

- API REST : `http://localhost:3003` (port `PORT`, contrat dans
  `docs/openapi/assessment-service.yaml`)
- Nécessite `question-service` lancé pour la génération automatique
  (`QUESTION_SERVICE_GRPC_URL`, défaut `localhost:50052`)
- Nécessite RabbitMQ pour la publication/consommation d'événements
  (`RABBITMQ_URL`, défaut `amqp://localhost:5672`) ; si le broker est
  indisponible, les endpoints REST restent fonctionnels (log d'avertissement
  au lieu d'un crash), seuls les événements sont alors perdus
- Stockage : MongoDB (`MONGO_URI`, mongoose)

## État d'implémentation

- [x] CRUD REST (`GET/POST /assessments`, `GET/PUT /assessments/:id`)
- [x] Génération automatique via gRPC (`SelectQuestions`)
- [x] Publication (`POST /assessments/:id/publish` + événement `assessment.published`)
- [x] Annulation (`POST /assessments/:id/cancel`)
- [x] CQRS : séparation Write/Read Model, Event Store, `GET /assessments/:id/results`
- [x] Reconstruction d'état (`POST /assessments/:id/rebuild`)
- [ ] `AssessmentClosingSoon` : événement défini côté publisher, déclencheur
      planifié (cron/scheduler) pas encore mis en place
- [ ] Consommation de `submission.completed` (pas encore émis, submission-service
      à construire par le Groupe 2)
