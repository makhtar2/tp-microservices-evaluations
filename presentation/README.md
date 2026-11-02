# Support de soutenance

Présentation de la **Plateforme distribuée de gestion des évaluations**
(projet Evalio) — Université Cheikh Ahmadoul Khadim (UCAK), Licence 3
Développement d'Applications Réparties.

- **Fichier à projeter** : [`Soutenance-Plateforme-Evaluations.pptx`](Soutenance-Plateforme-Evaluations.pptx)
  (34 slides, format 16:9, s'ouvre dans PowerPoint ou Google Slides)
- **Durée** : environ 27 minutes, dont 10 de démonstration
- **Encadrement** : Madame Ngom

Un seul support pour toute l'équipe : chaque membre présente la partie qu'il a
réalisée. Son nom figure en bas de chaque slide.

L'ancien modèle du support est conservé dans
[`ancien-modele/`](ancien-modele/Soutenance-Plateforme-Evaluations-ancien-modele.pptx).

## Sommaire

1. [Répartition](#répartition)
2. [Régénérer le support](#régénérer-le-support)
3. [Origine des chiffres](#origine-des-chiffres)

## Répartition

La répartition suit le travail réel de chacun, tel qu'il apparaît dans
`CONTRIBUTING.md` et dans l'historique Git. 

| Partie | Présentateur | Slides | Durée | Sujets |
|---|---|---|---|---|
| Ouverture | El Hadji Fallou Bousso | 1 à 3 | 1 min 30 | titre, déroulé, équipe |
| 1. Contexte & besoins | Makhtar Wade | 4 à 7 | 1 min 45 | problème, acteurs, fonctionnalités, règles métier |
| 2. Conception DDD & domaine Questions | Makhtar Wade | 8 à 11 | 1 min 45 | Bounded Contexts, Context Map, question-service et gRPC |
| 3. Architecture distribuée | El Hadji Fallou Bousso | 12 à 17 | 4 min | vue d'ensemble, REST/gRPC/AMQP, API Gateway et JWT, bus RabbitMQ, cycles de vie |
| 4. CQRS & Event Sourcing | Mouhamed Mbacke | 18 à 21 | 2 min | séparation écriture/lecture, Event Store, reconstruction, Read Model |
| 5. Saga, fiabilité & tests | Mame Bara Samb | 22 à 27 | 3 min | Saga chorégraphiée, compensation, dead-letters, sécurité, resoumission, frontend, tests |
| 6. Déploiement & démonstration | Pape Makhtar Aidara | 28 à 31 | 11 min 30 | Docker, documentation, démonstration |
| Conclusion : principes | Mouhamed Mbacke | 32 | 30 s | principes des systèmes distribués démontrés |
| Conclusion : bilan | Pape Makhtar Aidara | 33 | 30 s | bilan chiffré, enseignements, perspectives |
| Questions | toute l'équipe | 34 | — | chacun répond sur sa partie |


### Ce que chacun a réalisé

| Membre | Groupe | Réalisations (dépôt Git) |
|---|---|---|
| Makhtar Wade | Groupe 1 | structure du dépôt, analyse DDD et cahier de conception, CRUD question-service et assessment-service, gRPC `SelectQuestions`, contrats OpenAPI, scaffold du frontend React |
| Mouhamed Mbacke | Groupe 1 | question-service persisté dans MongoDB, CQRS et Event Sourcing sur assessment-service, publication de `AssessmentPublished`, reconstruction d'état et Read Model des résultats |
| El Hadji Fallou Bousso | Groupe 2 | user-service (JWT, rôles), api-gateway, submission-service, grading-service, notification-service, mise en place de RabbitMQ |
| Mame Bara Samb | Groupe 2 | compensation de la Saga et dead-letters, resoumission, planification, durcissement sécurité, frontend complet, 234 tests unitaires et 40 tests bout-en-bout |
| Pape Makhtar Aidara | Groupe 2 | docker-compose (15 conteneurs), Dockerfiles, `.dockerignore`, documentation des services et README racine, suite de validation docs et Docker |
> Pour changer la répartition : modifier `lib/plan.js` (plan et slide
> répartition) et la constante `SPEAKER` en tête du fichier de la partie dans
> `slides/` (nom en pied de page), puis `npm run build`.

## Régénérer le support

Le fichier PowerPoint est généré par du code (bibliothèque
[pptxgenjs](https://gitbrent.github.io/PptxGenJS/)) : textes, schémas et
mise en page sont dans ce dossier, ce qui permet de corriger une slide et
de régénérer tout le support.

```bash
cd presentation
npm install
npm run build          # écrit Soutenance-Plateforme-Evaluations.pptx
```

PowerPoint verrouille le fichier tant qu'il est ouvert : le fermer avant
`npm run build`, ou générer une copie avec `node build.js <fichier>`.

| Fichier | Rôle |
|---|---|
| `build.js` | assemble les parties dans l'ordre et écrit le `.pptx` |
| `lib/theme.js` | couleurs, polices (Cambria, Calibri, Courier New), présentateurs |
| `lib/plan.js` | déroulé : parties, présentateurs, durées, réalisations |
| `lib/kit.js` | composants : gabarits de slides, boîtes, flèches, encadrés, captures, tableaux |
| `slides/00-ouverture.js` … `slides/07-conclusion.js` | une partie par fichier |
| `assets/captures/` | captures d'écran utilisées dans les slides |

Mettre à jour les captures (stack Docker lancée, comptes de démonstration
créés) :

```bash
cd e2e && node ui/parcours-interface.js          # parcours UI → e2e/logs/ui/
cp e2e/logs/ui/*.png presentation/assets/captures/
cd presentation && node scripts/capture-rabbitmq.js   # captures RabbitMQ
```

Relire le rendu sans ouvrir PowerPoint (Windows, PowerPoint installé) :
`powershell -File scripts/apercu.ps1` exporte chaque slide en PNG dans
`apercu/` (dossier ignoré par Git).

## Origine des chiffres

Tous les chiffres du support sont relevés sur le dépôt ou sur la stack en
fonctionnement :

| Chiffre | Source |
|---|---|
| 8 événements, 4 queues + 4 dead-letters, 16 liaisons | API d'administration RabbitMQ (`/api/bindings`) sur la stack Docker |
| 234 tests unitaires (grading 58, assessment 53, submission 40, user 33, api-gateway 19, notification 17, question 14) | appels `it(` / `test(` dans `*/test/*.test.js` |
| 40 tests bout-en-bout en 5 scénarios | `e2e/scenarios/*.test.js` |
| 110 vérifications docs et Docker | sortie de `node e2e/scripts/test-docs-and-docker.js` |
| 15 conteneurs, 8 volumes, 7 healthchecks | `docker-compose.yml` |
| Relance toutes les 30 s, 5 tentatives | `GRADING_RETRY_INTERVAL_MS`, `GRADING_MAX_ATTEMPTS` (grading-service) |
| Captures d'écran | `e2e/ui/parcours-interface.js` (8 étapes réussies) et `scripts/capture-rabbitmq.js` |
