# Plateforme distribuée de gestion des évaluations

Projet de classe - Systèmes distribués (architecture microservices).

## Domaine métier

Plateforme permettant aux enseignants de créer et gérer des évaluations
(banque de questions, planification, publication, correction) et aux
étudiants de les réaliser et de soumettre leurs réponses.

## Services

| Service | Responsabilité | Données | Communication |
|---|---|---|---|
| user-service | Authentification, gestion des rôles (Admin/Enseignant/Étudiant), profils | Users, Roles | REST |
| question-service | Banque de questions (CRUD, recherche, filtre) | Questions | REST + gRPC (SelectQuestions) |
| assessment-service | Création, planification, publication des évaluations | Evaluations | REST + Messaging |
| submission-service | Réalisation, saisie de réponses, dépôt de fichiers, soumission | Submissions | REST + Messaging |
| grading-service | Correction automatique et manuelle, notes, commentaires | Grades | REST + Messaging |
| notification-service | Envoi des notifications aux utilisateurs | Notifications | Messaging |
| api-gateway | Routage, authentification centralisée | - | REST |
| frontend | Interface web (React) enseignant/étudiant | - | REST (via api-gateway à terme) |

## Cycle de vie d'une évaluation

Création des questions → Construction de l'évaluation → Planification →
Publication → Réalisation → Soumission → Correction → Résultats

## Communication entre services

- **Synchrone** : REST (CRUD) et gRPC (`assessment-service` → `question-service`
  pour la génération automatique d'une évaluation).
- **Asynchrone** : broker de messages (RabbitMQ), événements
  `AssessmentPublished`, `SubmissionCompleted`, `AssessmentClosingSoon`,
  `GradingCompleted`, `ResultPublished`.
- **Saga** : coordination Soumission → Correction → Notification, avec
  compensation en cas d'échec.
- **CQRS + Event Sourcing** : séparation lecture/écriture sur `assessment-service`.

## Stack technique

- Backend : Node.js / Express (un service par dossier)
- Frontend : React (Vite), voir `frontend/`
- Communication : REST, gRPC (`assessment-service` → `question-service`),
  RabbitMQ pour les événements
- Conteneurisation : Docker / Docker Compose
- Contrats d'API : OpenAPI/Swagger (voir `docs/openapi/`)

## Documentation

- [Cahier de conception](docs/cahier-de-conception.md) — problème, acteurs, règles métier, cas d'utilisation, user stories
- [Analyse DDD](docs/ddd-analysis.md) — domaine, sous-domaines, Bounded Contexts, Context Map
- [Architecture](docs/architecture.md) — diagramme, flux, Saga, CQRS/Event Sourcing

## Démarrage

### Message broker (RabbitMQ)

```bash
docker compose up -d rabbitmq
```

- AMQP : `amqp://localhost:5672` (valeur par défaut de `RABBITMQ_URL` dans
  chaque service)
- Interface d'admin : http://localhost:15672 (guest / guest) — permet de
  voir l'exchange `evaluations.events`, les queues de chaque service et
  les messages qui transitent
- L'exchange et les queues sont déclarés par les services eux-mêmes au
  démarrage (voir « Convention de messaging » dans
  [docs/architecture.md](docs/architecture.md))

Chaque service se lance ensuite avec `npm install && npm start` dans son
dossier (MongoDB local requis, voir le `.env.example` du service).
