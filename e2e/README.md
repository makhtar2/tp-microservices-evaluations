# Tests bout-en-bout

Tests de la plateforme complète : tous les services sont démarrés, et chaque
requête passe par l'`api-gateway` avec un vrai JWT, comme le fait le frontend.
Aucune dépendance npm : les tests utilisent `node:test` et `fetch` (Node ≥ 20).

## Lancer les tests

Prérequis : Docker, et les dépendances de chaque service installées.

```bash
cd e2e
npm run install:services   # une seule fois : npm ci dans chaque service
npm test
```

`npm test` :

1. démarre un MongoDB et un RabbitMQ **jetables** (`e2e/docker-compose.yml`,
   ports 27018 et 5673, aucun volume). Les données de développement ne sont
   jamais touchées ;
2. crée les comptes de test (`user-service/src/scripts/seed.js`) ;
3. lance les 7 services sur les ports 4100 à 4105 (gRPC sur 4162) ;
4. exécute les scénarios, puis arrête tout et supprime les conteneurs.

Les logs de chaque service sont écrits dans `e2e/logs/` (ignoré par git).

| Variable | Effet |
|---|---|
| `E2E_BASE_PORT` | Premier port des services (défaut `4100`) |
| `E2E_MONGO_PORT`, `E2E_RABBITMQ_PORT` | Ports de l'infrastructure (défaut `27018`, `5673`) |
| `E2E_SKIP_INFRA=1` | Ne gère pas Docker (MongoDB et RabbitMQ déjà lancés sur ces ports) |
| `E2E_KEEP_INFRA=1` | Garde les conteneurs après les tests (inspection des bases) |

## Scénarios

### Parcours complet (`scenarios/parcours-complet.test.js`)

Création → publication → soumission → correction → résultat :

- banque de 4 questions (QCM, vrai/faux, réponse courte, question ouverte) ;
- évaluation générée automatiquement (gRPC `SelectQuestions`), barème calculé ;
- publication → `assessment.published` → ouverture de la copie ;
- sauvegarde des réponses en plusieurs fois, dépôt d'un fichier, soumission ;
- `submission.completed` → correction automatique (question ouverte en attente) ;
- aucun résultat visible avant la validation ;
- correction manuelle, validation → `result.published` → résultats dans le
  Read Model d'`assessment-service` ;
- reconstruction du Read Model depuis l'Event Store, avec un état identique.

### Échec : dépôt hors délai (`scenarios/echec-hors-delai.test.js`)

- ouverture d'une copie avant la date de début, puis après la date de fin : refusée ;
- copie ouverte à temps, soumise après l'échéance : refusée, statut
  `REFUSEE_HORS_DELAI`, réponses conservées, plus aucune modification possible ;
- aucune correction n'est déclenchée pour une copie refusée ;
- dépôt de fichier après l'échéance : refusé, le fichier n'est pas rattaché à la copie.

### Échec : correction manquante (`scenarios/echec-correction.test.js`)

- question ouverte non notée : validation refusée, copie visible dans les
  corrections en attente, aucun résultat publié ;
- note hors barème, question inconnue, autre enseignant, étudiant : refusés ;
- `question-service` arrêté pendant la correction automatique : la copie
  reste `SOUMISE`, la correction reste `EN_ATTENTE` avec l'erreur enregistrée,
  et l'enseignant ne peut ni noter ni valider. `question-service` est
  redémarré à la fin du scénario.

### Sécurité et planification (`scenarios/securite-et-planification.test.js`)

Règles appliquées à partir de l'identité transmise par l'api-gateway :

- un étudiant lit les questions sans les bonnes réponses ni le guide de correction ;
- un brouillon est invisible pour les étudiants ;
- l'enseignant responsable d'une évaluation est celui du token ;
- un étudiant ne peut ni ouvrir, ni lire, ni modifier la copie d'un autre ;
- un fichier exécutable est refusé au dépôt ;
- un étudiant ne voit que son propre résultat (avec la moyenne de la classe).

Planification : une évaluation planifiée est publiée automatiquement à la
date prévue (`AssessmentPublished` émis, copie ouvrable), et une date passée
ou une évaluation sans question est refusée.

## Test de l'interface (`ui/parcours-interface.js`)

Parcours complet sur la vraie interface React, dans Chrome headless (piloté
par le protocole DevTools, sans dépendance) : l'enseignant crée un QCM et une
question ouverte, construit une évaluation avec le sélecteur de questions et
la publie ; l'étudiant la passe (enregistrement automatique, soumission) ;
l'enseignant corrige et valide ; l'étudiant consulte son résultat ;
l'administrateur ouvre la gestion des comptes. Une capture de chaque étape
est écrite dans `e2e/logs/ui/`.

```bash
cd e2e && npm run stack                                   # terminal 1
cd frontend && API_URL=http://127.0.0.1:4100 npm run dev  # terminal 2
cd e2e && npm run test:ui                                 # terminal 3
```

`CHROME_PATH` indique Chrome s'il n'est pas à l'emplacement par défaut ;
`FRONTEND_URL` change l'adresse du frontend (défaut `http://localhost:5173`).
`npm run stack` sert aussi pour une démo sur une machine qui manque de mémoire
pour `docker compose`.
