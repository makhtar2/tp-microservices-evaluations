# Plateforme Distribuée de Gestion des Évaluations

> **Projet d'Architecture Distribuée & Microservices (L3)**  
> **Responsable de la documentation technique** : Pape Makhtar Aidara

Plateforme complète permettant aux enseignants de créer et gérer des évaluations (banque de questions, planification, publication, correction automatique et manuelle) et aux étudiants de réaliser et soumettre leurs travaux en ligne.

---

## 1. Vue d'Ensemble des Services

L'architecture repose sur 7 microservices backend, une passerelle d'accès (API Gateway), une application frontend et une infrastructure de messagerie asynchrone (RabbitMQ). Chaque service possède sa propre base de données MongoDB isolée.

| Service | Port(s) | Responsabilité | Stockage / DB | Communication |
|---|---|---|---|---|
| [`api-gateway`](api-gateway/README.md) | **3000** | Point d'entrée unique, reverse proxy, validation JWT et contrôle d'accès RBAC | Sans état (Stateless) | REST entrant / sortant |
| [`user-service`](user-service/README.md) | **3001** | Gestion des utilisateurs, profils et authentification par token JWT | MongoDB (`user_service`) | REST |
| [`question-service`](question-service/README.md) | **3002** (REST)<br>**50052** (gRPC) | Banque de questions multitypes, critères de correction et sélection gRPC | MongoDB (`question_service`) | REST + gRPC |
| [`assessment-service`](assessment-service/README.md) | **3003** | Création, planification et publication d'évaluations (CQRS + Event Sourcing) | MongoDB (`assessment_service`) | REST + gRPC client + RabbitMQ |
| [`submission-service`](submission-service/README.md) | **3004** | Dépôt des copies étudiants, sauvegarde continue, upload de devoirs et contrôle de date | MongoDB (`submission_service`) + Stockage fichiers | REST + RabbitMQ |
| [`grading-service`](grading-service/README.md) | **3005** | Correction automatique des questions fermées, saisie des notes manuelles et publication | MongoDB (`grading_service`) | REST + RabbitMQ |
| [`notification-service`](notification-service/README.md) | *Worker sans port HTTP* | Consommation des événements métier et enregistrement/diffusion des notifications | MongoDB (`notification_service`) | RabbitMQ uniquement |
| [`frontend`](frontend/README.md) | **5173** | Interface web enseignant/étudiant en React 19, Tailwind CSS v4 et Vite | Client Web (SPA) | REST (vers Gateway ou proxy direct) |

---

## 2. Dépendances et Prérequis Système

- **Node.js** : version `>= 20.0.0` (testé avec Node v24)
- **npm** : version `>= 10.0.0`
- **MongoDB** : instance locale ou conteneur (`mongodb://127.0.0.1:27017`)
- **Docker & Docker Compose** : requis pour exécuter le broker de messages RabbitMQ

---

## 3. Matrice des Ports et Variables d'Environnement

Chaque service dispose d'un modèle `.env.example`. Voici la synthèse des ports et URLs :

| Service | Variable Port | Port Défaut | Dépendances & URLs requises |
|---|---|---|---|
| **RabbitMQ** | - | `5672` (AMQP)<br>`15672` (UI Admin) | Interface d'administration : `http://localhost:15672` (guest / guest) |
| **api-gateway** | `PORT` | `3000` | `USER_SERVICE_URL=http://localhost:3001`<br>`QUESTION_SERVICE_URL=http://localhost:3002`<br>`ASSESSMENT_SERVICE_URL=http://localhost:3003`<br>`SUBMISSION_SERVICE_URL=http://localhost:3004`<br>`GRADING_SERVICE_URL=http://localhost:3005` |
| **user-service** | `PORT` | `3001` | `MONGO_URI=mongodb://127.0.0.1:27017/user_service`<br>`JWT_SECRET=change-me-en-dev` |
| **question-service** | `PORT`<br>`GRPC_PORT` | `3002`<br>`50052` | `MONGO_URI=mongodb://127.0.0.1:27017/question_service` |
| **assessment-service** | `PORT` | `3003` | `MONGO_URI=mongodb://127.0.0.1:27017/assessment_service`<br>`QUESTION_SERVICE_GRPC_URL=localhost:50052`<br>`RABBITMQ_URL=amqp://localhost:5672` |
| **submission-service** | `PORT` | `3004` | `MONGO_URI=mongodb://127.0.0.1:27017/submission_service`<br>`RABBITMQ_URL=amqp://localhost:5672` |
| **grading-service** | `PORT` | `3005` | `MONGO_URI=mongodb://127.0.0.1:27017/grading_service`<br>`RABBITMQ_URL=amqp://localhost:5672`<br>`ASSESSMENT_SERVICE_URL=http://localhost:3003`<br>`QUESTION_SERVICE_URL=http://localhost:3002` |
| **notification-service** | *Aucun* | - | `MONGO_URI=mongodb://127.0.0.1:27017/notification_service`<br>`RABBITMQ_URL=amqp://localhost:5672` |
| **frontend** | - | `5173` | `API_URL=http://localhost:3000` : toutes les requêtes `/api/*` passent par l'api-gateway (`http://api-gateway:3000` dans docker compose) |

---

## 4. Comptes de Test et Données Initiales

### 1. Comptes Utilisateurs (`user-service`)
Le script de seed initialise les 3 comptes de démonstration pour couvrir tous les cas d'utilisation :

```bash
cd user-service && npm run seed
```

| Rôle | Email | Mot de passe | Description & Permissions |
|---|---|---|---|
| `ADMINISTRATEUR` | `admin@evaluations.local` | `admin123` | Gestion globale des utilisateurs et des statuts de compte |
| `ENSEIGNANT` | `enseignant@evaluations.local` | `enseignant123` | Création de questions, d'évaluations et correction des copies |
| `ETUDIANT` | `etudiant@evaluations.local` | `etudiant123` | Consultation, passage des examens et consultation de ses notes |

### 2. Banque de Questions (`question-service`)
Un jeu de questions variées (QCM, Vrai/Faux, questions courtes, questions ouvertes) portant sur les *Systèmes Distribués* est prêt à l'emploi :

```bash
cd question-service && node src/scripts/seed.js
```

---

## 5. Guide d'Installation et de Démarrage

### Démarrage rapide : tout dans Docker

```bash
# 1. Infrastructure : RabbitMQ et les bases MongoDB (une par service)
docker compose up -d --wait rabbitmq user-db question-db assessment-db submission-db grading-db notification-db

# 2. Microservices, api-gateway et frontend
docker compose up -d --build

# 3. Comptes de démonstration et banque de questions
docker compose exec user-service npm run seed
docker compose exec question-service node src/scripts/seed.js
```

L'interface est sur [http://localhost:5173](http://localhost:5173) et la gateway sur `http://localhost:3000`.
Démarrer l'infrastructure avant les services évite de saturer la mémoire : la stack complète compte 15 conteneurs.
Si l'interface ne répond pas comme prévu, vérifier qu'aucun `npm run dev` local n'occupe déjà le port 5173.

Pour lancer les services sans Docker, suivre les étapes ci-dessous.

### Étape 1 : Démarrer l'infrastructure partagée (RabbitMQ)
```bash
docker compose up -d rabbitmq
```
L'interface de gestion RabbitMQ est immédiatement accessible sur [http://localhost:15672](http://localhost:15672) (identifiants : `guest` / `guest`).

### Étape 2 : Installer les dépendances
Installer les packages pour l'ensemble des microservices et du frontend :
```bash
# Option A : script automatisé
cd e2e && npm run install:services && cd ..

# Option B : installation manuelle dans chaque dossier
cd api-gateway && npm install && cd ..
cd user-service && npm install && cd ..
cd question-service && npm install && cd ..
cd assessment-service && npm install && cd ..
cd submission-service && npm install && cd ..
cd grading-service && npm install && cd ..
cd notification-service && npm install && cd ..
cd frontend && npm install && cd ..
```

### Étape 3 : Initialiser les bases de données (Seed)
```bash
# Initialiser les utilisateurs
node user-service/src/scripts/seed.js

# Initialiser la banque de questions
node question-service/src/scripts/seed.js
```

### Étape 4 : Lancer les services
Dans des terminaux séparés (ou via un orchestrateur de processus) :

```bash
# 1. Services fondamentaux
cd user-service && npm start
cd question-service && npm start

# 2. Services métier
cd assessment-service && npm start
cd submission-service && npm start
cd grading-service && npm start
cd notification-service && npm start

# 3. Passerelle et Interface Web
cd api-gateway && npm start
cd frontend && npm run dev
```

---

## 6. Synthèse des API Principales (via API Gateway - Port 3000)

Toutes les requêtes peuvent être adressées à la passerelle sur `http://localhost:3000/api` avec l'en-tête `Authorization: Bearer <token_jwt>`.

### Authentification & Utilisateurs
- `POST /api/auth/login` : Connexion et récupération du JWT (Public).
- `GET /api/users` : Liste des profils (`ADMINISTRATEUR`, `ENSEIGNANT`).
- `POST /api/users` : Création de compte (`ADMINISTRATEUR`).
- `PATCH /api/users/:id/status` : Activation / Désactivation (`ADMINISTRATEUR`).

### Banque de Questions
- `GET /api/questions` : Consultation et recherche avec filtres (`subject`, `difficulty`, etc.).
- `POST /api/questions` : Création de question (Enseignant/Admin).
- `DELETE /api/questions/:id` : Archivage / suppression douce (Enseignant/Admin).
- *RPC interne* : `QuestionService.SelectQuestions` sur le port `50052`.

### Évaluations (CQRS / Event Sourcing)
- `GET /api/assessments` : Liste des évaluations projetées dans le Read Model.
- `POST /api/assessments` : Création (manuelle ou par tirage automatique gRPC).
- `POST /api/assessments/:id/publish` : Publication officielle (émet `assessment.published`).
- `POST /api/assessments/:id/cancel` : Annulation de l'évaluation.
- `GET /api/assessments/:id/results` : Résultats et moyenne de l'évaluation (visibles post-validation).
- `POST /api/assessments/:id/rebuild` : Recalcul complet de la projection depuis l'Event Store.

### Soumissions
- `POST /api/submissions` : Début d'une tentative étudiante sur une évaluation ouverte.
- `PUT /api/submissions/:id/answers` : Sauvegarde intermédiaire des réponses (brouillon).
- `POST /api/submissions/:id/files` : Téléversement de devoir (multipart/form-data).
- `POST /api/submissions/:id/submit` : Remise définitive et émission de `submission.completed`.

### Correction & Notes
- `GET /api/gradings/pending` : Copies en attente de correction manuelle (Enseignant).
- `PUT /api/gradings/:submissionId/questions/:questionId` : Attribution de note et commentaire.
- `POST /api/gradings/:submissionId/validate` : Validation définitive de la copie et publication (`result.published`).

---

## 7. Saga Métier et Événements Asynchrones

La plateforme utilise le patron de **Saga chorégraphiée** sur l'exchange Topic `evaluations.events` :

```
                  ┌──────────────────────┐
                  │  assessment-service  │
                  └──────────┬───────────┘
                             │ assessment.published
                             ▼
                  ┌──────────────────────┐
                  │  submission-service  │ (Ouvre l'accès aux étudiants)
                  └──────────┬───────────┘
                             │ submission.completed
                             ▼
                  ┌──────────────────────┐
                  │   grading-service    │ (Correction auto des QCM/questions courtes)
                  └──────────┬───────────┘
                             │ result.published (après validation manuelle enseignant)
                             ▼
         ┌───────────────────┴───────────────────┐
         ▼                                       ▼
┌──────────────────┐                   ┌──────────────────────┐
│assessment-service│                   │ notification-service │
│(Actualise notes) │                   │(Alerte l'étudiant)   │
└──────────────────┘                   └──────────────────────┘
```

---

## 8. Tests

### Tests unitaires

Chaque service backend a ses tests unitaires dans son dossier `test/`
(`node:test`, Node ≥ 22). MongoDB, RabbitMQ et les services distants y sont
simulés : aucune infrastructure n'est nécessaire.

```bash
cd grading-service && npm test   # un seul service
cd e2e && npm run test:unit      # tous les services, avec récapitulatif
```

| Service | Ce qui est testé |
|---|---|
| `api-gateway` | Routage et réécriture des chemins, JWT, rôles par méthode, anti-usurpation `X-User-*`, 502 si un service est indisponible |
| `user-service` | Émission/vérification des JWT, hachage des mots de passe, routes login et gestion des comptes |
| `question-service` | Répartition par difficulté et sélection gRPC `SelectQuestions` |
| `assessment-service` | Projection Event Sourcing et rebuild, règles de publication/annulation, statistiques des résultats |
| `submission-service` | Cycle de vie d'une copie, refus hors délai, événement `submission.completed` |
| `grading-service` | Correction automatique par type de question, correction manuelle, validation, copie `EN_ATTENTE` si un service est injoignable |
| `notification-service` | Notifications produites pour chacun des 5 événements métier |

Ces tests tournent aussi sur GitHub Actions à chaque push sur `main` et à
chaque pull request (`.github/workflows/tests.yml`).

### Tests bout-en-bout (E2E)

Pour exécuter la suite de tests automatisée validant le cycle de vie complet (nominal et scénarios d'erreur) :

```bash
cd e2e
npm test
```

---

## 9. Liens et Documentation Détaillée

- [README `api-gateway`](api-gateway/README.md)
- [README `user-service`](user-service/README.md)
- [README `question-service`](question-service/README.md)
- [README `assessment-service`](assessment-service/README.md)
- [README `submission-service`](submission-service/README.md)
- [README `grading-service`](grading-service/README.md)
- [README `notification-service`](notification-service/README.md)
- [README `frontend`](frontend/README.md)
- [Cahier de conception métier](docs/cahier-de-conception.md)
- [Analyse Domain-Driven Design (DDD)](docs/ddd-analysis.md)
- [Dossier d'Architecture Technique](docs/architecture.md)
- [Spécifications OpenAPI / Swagger](docs/openapi/)
