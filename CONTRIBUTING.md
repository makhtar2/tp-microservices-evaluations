# Contribuer au projet

Ce document décrit l'équipe, la répartition du travail et les conventions à
suivre pour contribuer à la plateforme de gestion des évaluations.

Le suivi des tâches se fait sur le board Trello
[TP Systèmes distribués - Plateforme de gestion des évaluations](https://trello.com/b/DEr8BKAj/tp-syst%C3%A8mes-distribu%C3%A9s-plateforme-de-gestion-des-%C3%A9valuations).

## Équipe

| Membre | GitHub | Groupe |
|---|---|---|
| Makhtar Wade | [@makhtar2](https://github.com/makhtar2) | Groupe 1 |
| Mouhamed Mbacke | *à inviter sur le repo* | Groupe 1 |
| El Hadji Fallou Bousso | [@serignefalloubousso99-dot](https://github.com/serignefalloubousso99-dot) | Groupe 2 |
| Mame Bara Samb | [@bara-samb](https://github.com/bara-samb) | Groupe 2 |
| Pape Makhtar Aidara | *à confirmer / inviter sur le repo* | Groupe 2 |
| Fatou Ngom | *à confirmer / inviter sur le repo* | non assignée pour l'instant |

> Toute personne listée ci-dessus sans compte GitHub confirmé doit être
> invitée comme collaboratrice/collaborateur sur le repo
> (`makhtar2/tp-microservices-evaluations`) et ajoutée au board Trello.

## Répartition du travail

### Groupe 1 — Domaine Questions & Évaluations (CQRS/Event Sourcing)
Responsables : Makhtar Wade, Mouhamed Mbacke

**Makhtar Wade** — socle CRUD & communication :
- `question-service` : CRUD REST de la banque de questions (fait)
- `question-service` : endpoint gRPC `SelectQuestions` côté serveur (fait)
- `assessment-service` : CRUD REST des évaluations (fait)
- `assessment-service` : appel gRPC vers `question-service` pour la
  génération automatique (fait)

**Mouhamed Mbacke** — événements & CQRS/Event Sourcing (s'appuie sur le
CRUD `assessment-service` ci-dessus) :
- Publication de l'événement `AssessmentPublished`
- Séparation Write Model / Read Model sur `assessment-service`
- Event Store simplifié
- Reconstruction d'état à partir des événements
- Requêtes de lecture (`GET /assessments/:id/results`)

### Groupe 2 — Domaine Utilisateurs, Soumission, Correction & Orchestration
Responsables : El Hadji Fallou Bousso, Mame Bara Samb, Pape Makhtar Aidara

- `user-service` : authentification, gestion des rôles
  (Admin/Enseignant/Étudiant)
- `submission-service` : CRUD des soumissions/copies, consommation de
  `AssessmentPublished`
- `grading-service` : correction manuelle et résultats, consommation de
  `SubmissionCompleted`
- `notification-service` : consommation des 5 événements métier
  (messaging uniquement, pas d'API REST)
- `api-gateway` : point d'entrée unique, routage, authentification
  centralisée
- Setup du message broker (RabbitMQ)
- Implémentation de la Saga choréographiée Soumission → Correction →
  Notification, gestion de la compensation, tests des scénarios d'échec

### Toute l'équipe (tâches transverses)
- Contrats OpenAPI (`docs/openapi/*.yaml`)
- Conteneurisation (Dockerfile par service + `docker-compose.yml`)
- Tests bout-en-bout du parcours complet (création → publication →
  soumission → correction → résultat)
- Documentation technique (README par service + racine)
- Préparation de la démo / soutenance

## Conventions de travail

- **Branches** : une branche par tâche/carte Trello, nommée
  `<type>/<service>-<courte-description>` (ex. `feat/question-crud-api`).
- **Commits** : suivre le style déjà utilisé sur `main`
  (`feat:`, `fix:`, `docs:`, `chore:`, `test:`) suivi d'un résumé concis.
- **Pull Requests** : une PR par tâche, review par au moins un membre de
  l'autre groupe avant de merger sur `main`, description liée à la carte
  Trello correspondante.
- **Contrats d'API** : toute modification d'un endpoint REST doit être
  répercutée dans le fichier OpenAPI correspondant (`docs/openapi/`).
- **Événements** : tout changement de schéma d'événement (nom, payload)
  doit être communiqué aux services consommateurs concernés avant merge.
