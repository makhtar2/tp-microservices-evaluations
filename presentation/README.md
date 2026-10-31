# Support de soutenance

Présentation de la **Plateforme distribuée de gestion des évaluations**
(projet Evalio) — Université Cheikh Ahmadoul Khadim (UCAK), Licence 3
Développement d'Applications Réparties.

- **Fichier à projeter** : [`Soutenance-Plateforme-Evaluations.pptx`](Soutenance-Plateforme-Evaluations.pptx)
  (34 slides, format 16:9, s'ouvre dans PowerPoint ou Google Slides)
- **Durée** : environ 26 minutes, démonstration comprise, puis questions
- **Notes de l'orateur** : chaque slide contient, dans la zone de notes
  PowerPoint, ce qu'il faut dire. Ce README reprend ces notes et les
  complète.

Un seul support pour toute l'équipe : **chaque membre présente la partie
qu'il a réalisée**. Sur chaque slide, le bandeau « Présenté par … » en haut
à droite (de la couleur du présentateur) indique qui parle.

## Sommaire

1. [Répartition](#répartition)
2. [Contenu slide par slide](#contenu-slide-par-slide)
3. [Démonstration en direct](#démonstration-en-direct)
4. [Conseils pour le jour J](#conseils-pour-le-jour-j)
5. [Régénérer le support](#régénérer-le-support)
6. [Origine des chiffres](#origine-des-chiffres)

## Répartition

La répartition suit le travail réel de chacun, tel qu'il apparaît dans
`CONTRIBUTING.md` et dans l'historique Git. Le temps de parole est
équilibré (3 à 5 minutes chacun).

| Partie | Présentateur | Slides | Durée | Sujets |
|---|---|---|---|---|
| Ouverture | Fatou Ngom | 1 à 3 | 1 min | titre, déroulé, équipe |
| 1. Contexte & besoins | Fatou Ngom | 4 à 7 | 3 min | problème, acteurs, fonctionnalités, règles métier |
| 2. Conception DDD & domaine Questions | Makhtar Wade | 8 à 12 | 4 min | Bounded Contexts, Context Map, question-service et gRPC, frontend |
| 3. Architecture distribuée | El Hadji Fallou Bousso | 13 à 18 | 5 min | vue d'ensemble, REST/gRPC/AMQP, API Gateway et JWT, bus RabbitMQ, cycles de vie |
| 4. CQRS & Event Sourcing | Mouhamed Mbacke | 19 à 22 | 4 min | séparation écriture/lecture, Event Store, reconstruction, Read Model |
| 5. Saga, fiabilité & tests | Mame Bara Samb | 23 à 27 | 4 min | Saga chorégraphiée, compensation, dead-letters, sécurité, resoumission, tests |
| 6. Déploiement & démonstration | Pape Makhtar Aidara | 28 à 31 | 4 min | Docker, documentation, démonstration |
| Conclusion | Fatou Ngom | 32 à 34 | 2 min | principes démontrés, bilan, perspectives, questions |

### Ce que chacun a réalisé

| Membre | Groupe | Réalisations (dépôt Git) |
|---|---|---|
| Makhtar Wade | Groupe 1 | structure du dépôt, analyse DDD et cahier de conception, CRUD question-service et assessment-service, gRPC `SelectQuestions`, contrats OpenAPI, scaffold du frontend React |
| Mouhamed Mbacke | Groupe 1 | question-service persisté dans MongoDB, CQRS et Event Sourcing sur assessment-service, publication de `AssessmentPublished`, reconstruction d'état et Read Model des résultats |
| El Hadji Fallou Bousso | Groupe 2 | user-service (JWT, rôles), api-gateway, submission-service, grading-service, notification-service, mise en place de RabbitMQ |
| Mame Bara Samb | Groupe 2 | compensation de la Saga et dead-letters, resoumission, planification, durcissement sécurité, frontend complet, 234 tests unitaires et 40 tests bout-en-bout |
| Pape Makhtar Aidara | Groupe 2 | docker-compose (15 conteneurs), Dockerfiles, `.dockerignore`, documentation des services et README racine, suite de validation docs et Docker |
| Fatou Ngom | — | aucune contribution dans le dépôt à ce jour : elle présente le contexte, les besoins et la conclusion (à confirmer par l'équipe) |

> Si l'équipe préfère une autre répartition, elle se change en un seul
> endroit : `lib/plan.js` (parties, présentateurs, durées), puis
> `npm run build` régénère le sommaire, la slide équipe et les bandeaux.
