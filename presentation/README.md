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

> Pour changer la répartition : modifier `lib/plan.js` (sommaire et slide
> équipe) et la constante `SPEAKER` en tête du fichier de la partie dans
> `slides/` (bandeau « Présenté par » et couleur), puis `npm run build`.

## Contenu slide par slide

Pour chaque slide : ce qu'elle montre, le message à faire passer, et pour
chaque partie les questions que le jury risque de poser.

### Ouverture — Fatou Ngom

| Slide | Contenu | Message |
|---|---|---|
| 1 | Titre, université, équipe, schéma de six services autour de RabbitMQ | « Six services autonomes qui communiquent par un bus d'événements » |
| 2 | Déroulé : six parties, présentateurs, durées | Chacun présente ce qu'il a construit |
| 3 | Équipe : réalisations de chaque membre | La répartition de la soutenance suit ce tableau |

### Partie 1 — Contexte & besoins (Fatou Ngom)

| Slide | Contenu | Message |
|---|---|---|
| 4 | Ouverture de la partie | — |
| 5 | Objectifs (centralisée, modulaire, évolutive) et cycle de vie en 8 étapes, de la question au résultat | La plateforme couvre tout le cycle ; le Groupe 1 en porte le début, le Groupe 2 la fin |
| 6 | Trois acteurs (enseignant, étudiant, administrateur) et fonctionnalités F1 à F10 avec leur service | Chaque fonctionnalité appartient à un service : c'est ce qui donne le découpage |
| 7 | Huit règles métier, avec le service qui les fait respecter | Chaque règle est garantie à un seul endroit, par le propriétaire de la donnée |

Questions probables :
- *Pourquoi des microservices plutôt qu'un monolithe ?* Le sujet
  l'impose, mais surtout : domaines bien séparés (questions, évaluations,
  copies, correction), équipes séparées, et besoin de résister à la panne
  d'une partie (la correction peut tomber sans empêcher de soumettre).
- *Où est appliqué le refus hors délai ?* Dans submission-service, qui
  connaît les dates par l'événement `assessment.published` (pas d'appel
  synchrone à assessment-service).

### Partie 2 — Conception DDD & domaine Questions (Makhtar Wade)

| Slide | Contenu | Message |
|---|---|---|
| 8 | Ouverture de la partie | — |
| 9 | Six Bounded Contexts (type Cœur, Support ou Générique, service, entités, rôle) | 1 Bounded Context = 1 microservice = 1 base ; pas de modèle partagé |
| 10 | Context Map : Conformist (JWT), Customer/Supplier (gRPC), Published Language (événements) | Un seul couplage synchrone ; tout le reste passe par des événements |
| 11 | question-service : CRUD REST, filtres, archivage, types de questions, appel gRPC `SelectQuestions` et extrait du `.proto` | gRPC là où l'enseignant attend la réponse : contrat typé, binaire compact |
| 12 | Frontend React (captures : sélecteur de questions, banque de questions) | Le navigateur ne parle qu'à l'API Gateway |

Questions probables :
- *Pourquoi gRPC pour SelectQuestions et pas un événement ?* L'enseignant
  attend la liste de questions pour construire son évaluation : c'est une
  requête/réponse. Le contrat `.proto` est partagé dans `docs/protos/`.
- *Que se passe-t-il si une question est supprimée ?* Archivage
  (suppression douce) : les évaluations passées gardent leurs questions
  (règle métier 8).

### Partie 3 — Architecture distribuée (El Hadji Fallou Bousso)

| Slide | Contenu | Message |
|---|---|---|
| 13 | Ouverture de la partie | — |
| 14 | Vue d'ensemble : navigateur, gateway, 6 services, 6 bases MongoDB, bus RabbitMQ | Une base par service ; un seul appel synchrone entre services ; notification-service n'a pas d'API |
| 15 | REST, gRPC, AMQP : où et pourquoi ; avantages du synchrone et de l'asynchrone | Synchrone seulement quand l'utilisateur attend ; sinon un événement |
| 16 | Diagramme de séquence : login, JWT, vérification dans la gateway, `X-User-Id` / `X-User-Role`, contrôle fin dans le service | Authentifier une fois, propager l'identité ; anti-usurpation des en-têtes |
| 17 | Les 8 routing keys, leur producteur et leurs consommateurs ; capture des queues RabbitMQ | 1 exchange topic, 4 queues + 4 dead-letters, 16 liaisons (relevées sur la stack) |
| 18 | Cycles de vie de la copie et de la correction, reliés par des événements | Aucune donnée partagée : les réponses voyagent dans `submission.completed` |

Questions probables :
- *Pourquoi un exchange de type topic ?* Chaque service déclare sa queue et
  s'abonne aux clés qui l'intéressent ; on ajoute un consommateur sans
  toucher au producteur.
- *Si RabbitMQ est arrêté ?* Les services démarrent quand même et leurs
  API REST répondent (connexion au broker tolérante, avertissement en log).
- *Pourquoi ne pas vérifier le JWT dans chaque service ?* La gateway le fait
  une fois ; les services appliquent seulement les règles fines à partir
  des en-têtes d'identité, que la gateway est seule à pouvoir poser.
