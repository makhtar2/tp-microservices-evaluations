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
- Communication : REST, gRPC (`assessment-service` → `question-service`),
  RabbitMQ pour les événements
- Conteneurisation : Docker / Docker Compose
- Contrats d'API : OpenAPI/Swagger (voir `docs/openapi/`)

## Documentation

- [Cahier de conception](docs/cahier-de-conception.md) — problème, acteurs, règles métier, cas d'utilisation, user stories
- [Analyse DDD](docs/ddd-analysis.md) — domaine, sous-domaines, Bounded Contexts, Context Map
- [Architecture](docs/architecture.md) — diagramme, flux, Saga, CQRS/Event Sourcing

## Démarrage

Structure à compléter au fur et à mesure de l'avancement (voir le board
de suivi du projet).
