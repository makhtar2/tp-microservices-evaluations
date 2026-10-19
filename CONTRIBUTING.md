# Contribuer au projet

Ce document décrit l'équipe, la répartition du travail et les conventions à
suivre pour contribuer à la plateforme de gestion des évaluations.

Le suivi des tâches se fait sur le board Trello
[TP Systèmes distribués - Plateforme de gestion des évaluations](https://trello.com/b/DEr8BKAj/tp-syst%C3%A8mes-distribu%C3%A9s-plateforme-de-gestion-des-%C3%A9valuations).

## Équipe

| Membre | GitHub | Groupe |
|---|---|---|
| Makhtar Wade | [@makhtar2](https://github.com/makhtar2) | Groupe 1 |
| Mouhamed Mbacke | [@mbacke935](https://github.com/mbacke935) | Groupe 1 |
| El Hadji Fallou Bousso | [@serignefalloubousso99-dot](https://github.com/serignefalloubousso99-dot) | Groupe 2 |
| Mame Bara Samb | [@bara-samb](https://github.com/bara-samb) | Groupe 2 |
| Pape Makhtar Aidara | *à confirmer / inviter sur le repo* | Groupe 2 |
| Fatou Ngom | *à confirmer / inviter sur le repo* | non assignée pour l'instant |

> Toute personne listée ci-dessus sans compte GitHub confirmé doit être
> invitée comme collaboratrice/collaborateur sur le repo
> (`makhtar2/tp-microservices-evaluations`) et ajoutée au board Trello.

## Répartition du travail

### Groupe 1 — Domaine Questions & Évaluations (CQRS/Event Sourcing)
Responsables : Makhtar Wade, Mouhamed Mbacke — **terminé**

**Makhtar Wade** — socle CRUD & communication :
- `question-service` : CRUD REST de la banque de questions (fait)
- `question-service` : endpoint gRPC `SelectQuestions` côté serveur (fait)
- `assessment-service` : CRUD REST des évaluations (fait)
- `assessment-service` : appel gRPC vers `question-service` pour la
  génération automatique (fait)

**Mouhamed Mbacke** — événements & CQRS/Event Sourcing (s'appuie sur le
CRUD `assessment-service` ci-dessus) :
- Publication de l'événement `assessment.published` (fait)
- Séparation Write Model / Read Model sur `assessment-service` (fait)
- Event Store simplifié (fait)
- Reconstruction d'état à partir des événements (fait,
  `POST /assessments/:id/rebuild`)
- Requêtes de lecture (`GET /assessments/:id/results`) (fait)

Mouhamed avait développé en parallèle une première version de
`question-service` avec persistance MongoDB (PR #1) ; elle a été adoptée
à la place de la version initiale en mémoire (voir historique Git). Ses
tâches CQRS/Event Sourcing ci-dessus ont été implémentées et testées
bout en bout par la suite (création → publication → événement RabbitMQ →
consommation `result.published` → `GET /results` → reconstruction).

### Frontend — Interface web
Responsables : Makhtar Wade, Mouhamed Mbacke

Scaffold React (Vite) posé, connecté à `question-service` et
`assessment-service` via le proxy de dev (voir `frontend/README.md`) :
Dashboard, Questions (CRUD), Évaluations (création manuelle/auto,
publication), Résultats. Design system maison (pas de librairie de
composants), inspiré d'une référence visuelle fournie par l'équipe.

Complété ensuite (toutes les requêtes passent par `api-gateway`, avec le
JWT de l'utilisateur connecté) :
- connexion réelle via `user-service`, menus et routes selon le rôle (fait)
- vue étudiant : réalisation d'une évaluation, enregistrement automatique,
  dépôt de fichier, soumission, résultats (fait)
- page de correction pour l'enseignant, relance des corrections
  automatiques en échec (fait)
- gestion des utilisateurs pour l'administrateur (fait)
- sélecteur de questions et planification de la publication (fait)

### Groupe 2 — Domaine Utilisateurs, Soumission, Correction & Orchestration
Responsables : El Hadji Fallou Bousso, Mame Bara Samb, Pape Makhtar Aidara

- `user-service` : authentification, gestion des rôles
  (Admin/Enseignant/Étudiant) (fait)
- `submission-service` : CRUD des soumissions/copies, consommation de
  `AssessmentPublished` (fait)
- `grading-service` : correction automatique et manuelle, résultats,
  consommation de `SubmissionCompleted` (fait)
- `notification-service` : consommation des événements métier
  (messaging uniquement, pas d'API REST) (fait)
- `api-gateway` : point d'entrée unique, routage, authentification
  centralisée (fait)
- Setup du message broker (RabbitMQ) (fait)
- Saga choréographiée Soumission → Correction → Notification avec
  compensation (relance, `grading.failed`, refus hors délai) et files
  dead-letters (fait, voir `docs/architecture.md`)
- Tests bout-en-bout des scénarios d'échec et tests unitaires de chaque
  service, CI GitHub Actions (fait, voir `e2e/` et README)

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
- **Pull Requests** : une PR par tâche, description liée à la carte
  Trello correspondante. Chaque groupe fusionne lui-même les PR de son
  périmètre sur `main` (rebase), sans attendre de review de l'autre
  groupe ; une review reste bienvenue, notamment quand une PR modifie le
  code ou les événements d'un service de l'autre groupe.
- **Contrats d'API** : toute modification d'un endpoint REST doit être
  répercutée dans le fichier OpenAPI correspondant (`docs/openapi/`).
- **Événements** : tout changement de schéma d'événement (nom, payload)
  doit être communiqué aux services consommateurs concernés avant merge.
