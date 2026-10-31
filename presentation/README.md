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

### Partie 4 — CQRS & Event Sourcing (Mouhamed Mbacke)

| Slide | Contenu | Message |
|---|---|---|
| 19 | Ouverture de la partie | — |
| 20 | Chemin d'écriture (commandes → Write Model → Event Store) et de lecture (projection → Read Model ← requêtes), événements entrants et sortants | Une commande n'écrit pas l'état : elle ajoute un événement |
| 21 | Journal d'une évaluation (`AssessmentCreated` → … → `ResultPublished`), fonction `applyEvent`, route `POST /assessments/:id/rebuild` | L'historique est la source de vérité ; le Read Model est reconstructible à tout moment |
| 22 | Captures : statut « Publiée » côté enseignant, note et moyenne côté étudiant | Le résultat n'apparaît qu'après `ResultPublished` (règle métier 6) |

Questions probables :
- *Que contient l'Event Store ?* La collection `AssessmentEvent`, en ajout
  seul : `assessmentId`, `type`, `payload`, date. Huit types d'événements.
- *Pourquoi `GradingCompleted` ne change-t-il rien de visible ?* Une note
  terminée n'est pas encore publiée : seul `ResultPublished` ajoute le
  résultat au Read Model.
- *Quel intérêt du rebuild ?* Après un incident ou un changement de
  projection, on recalcule l'état exact en rejouant les événements.

### Partie 5 — Saga, fiabilité & tests (Mame Bara Samb)

| Slide | Contenu | Message |
|---|---|---|
| 23 | Ouverture de la partie | — |
| 24 | Saga nominale : étudiant → submission → grading → enseignant, puis `grading.completed` et `result.published` vers trois consommateurs | Pas de coordinateur, transactions locales, réactions idempotentes |
| 25 | Compensation : `EN_ATTENTE`, relance toutes les 30 s, `ECHEC_CORRECTION` après 5 tentatives, `grading.failed`, incident signalé, relance par l'enseignant ; hors délai ; dead-letters | Une panne ne perd aucune copie ni aucun message |
| 26 | Durcissement sécurité et resoumission (règle métier 3), capture de la page de correction | Contrôle d'accès à deux niveaux ; resoumission refusée si le résultat est publié |
| 27 | 234 tests unitaires par service (graphique), 5 scénarios e2e (40 tests), infrastructure jetable | Chaque scénario d'échec est prouvé par un test |

Questions probables :
- *Chorégraphie ou orchestration ?* Chorégraphie : peu de services, et
  l'objectif était de montrer le couplage faible. Inconvénient assumé : le
  flux complet se lit dans la documentation plutôt que dans un seul code.
- *Comment éviter les doublons si un événement est rejoué ?* Les réactions
  sont idempotentes (par exemple, une correction déjà créée pour une copie
  n'est pas recréée).
- *Que devient un message qui fait planter un consommateur ?* Il est copié
  dans `<queue>.dead-letters` avec l'erreur et la date, puis acquitté ; on
  peut le rejouer depuis l'interface RabbitMQ.

### Partie 6 — Déploiement & démonstration (Pape Makhtar Aidara)

| Slide | Contenu | Message |
|---|---|---|
| 28 | Ouverture de la partie | — |
| 29 | Les 15 conteneurs par couche, réseau `evaluations-net`, 8 volumes, 7 healthchecks, commandes de démarrage | Toute la plateforme démarre avec docker compose, dans le bon ordre |
| 30 | README racine et par service, contrats OpenAPI et gRPC, documents de conception ; sortie réelle de la suite de validation (110/110) | La documentation est vérifiée automatiquement |
| 31 | Quatre captures du parcours et les quatre étapes de la démo live | Les captures viennent du test d'interface ; la démo rejoue le même parcours |

Questions probables :
- *Comment les services attendent-ils leur base ?* `depends_on` avec
  `condition: service_healthy` : un service ne démarre que lorsque sa base
  et RabbitMQ répondent à leur healthcheck.
- *Que vérifie la suite de validation ?* Présence et contenu des README,
  liens relatifs entre documents, Dockerfiles, `docker compose config`,
  services et volumes déclarés.

### Conclusion — Fatou Ngom

| Slide | Contenu | Message |
|---|---|---|
| 32 | Les six principes des systèmes distribués appliqués dans le projet | Synthèse : chaque principe renvoie à une partie |
| 33 | Bilan chiffré (6 services, 6 bases, 3 protocoles, 8 événements, 274 tests, 15 conteneurs), enseignements, perspectives | Pour la production : Kubernetes, observabilité, pattern Outbox, circuit breaker, CI |
| 34 | Merci, questions, membres, lien du dépôt | Chacun répond sur sa partie |
