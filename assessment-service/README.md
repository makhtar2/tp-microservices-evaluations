# assessment-service

Microservice de création, planification, publication et cycle de vie des évaluations. Il implémente les patrons d'architecture **CQRS** (Command Query Responsibility Segregation) et **Event Sourcing** pour garantir la traçabilité intégrale des états et supporter la forte charge en lecture.

---

## 1. Responsabilités

- **Création d'évaluations** : mode manuel (sélection de questions) ou mode automatisé (appel gRPC synchrone vers `question-service`).
- **Planification temporelle** : définition des dates d'ouverture/fermeture, durée limite (en minutes) et barème total.
- **Cycle de vie de l'évaluation** : gestion des états :
  `BROUILLON` $\rightarrow$ `PLANIFIÉE` $\rightarrow$ `PUBLIÉE` $\rightarrow$ `EN_COURS` $\rightarrow$ `TERMINÉE` $\rightarrow$ `CORRIGÉE` (ou `ANNULÉE`).
- **Publication d'événements métier** : notifie le reste du système lors de la publication ou de la clôture imminente.
- **Agrégation des résultats** : projection continue des notes reçues depuis `grading-service` pour exposition aux enseignants et étudiants.

---

## 2. Dépendances

### Infrastructure requise
- **Node.js** : version >= 20.x
- **MongoDB** : instance dédiée (base `assessment_service`).
- **RabbitMQ** : broker AMQP (`evaluations.events`, exchange topic).
- **question-service** : serveur gRPC joignable sur le port 50052 pour le tirage automatique.

### Dépendances npm principales
- `express` (^4.19.2) : serveur HTTP REST.
- `mongoose` (^8.5.0) : persistance des événements (Event Store) et des projections (Read Model).
- `amqplib` (^0.10.4) : client RabbitMQ pour la publication et l'écoute des événements de la Saga.
- `@grpc/grpc-js` (^1.10.9) & `@grpc/proto-loader` (^0.7.13) : client gRPC vers `question-service`.
- `cors` (^2.8.5) & `dotenv` (^16.4.5).

---

## 3. Ports et Variables d'environnement

### Port par défaut
- **3003** (HTTP REST)

### Fichier `.env`
Créer un fichier `.env` à la racine de `assessment-service` à partir de `.env.example` :

```env
PORT=3003
MONGO_URI=mongodb://127.0.0.1:27017/assessment_service
QUESTION_SERVICE_GRPC_URL=localhost:50052
RABBITMQ_URL=amqp://localhost:5672
```

| Variable | Description | Valeur par défaut |
|---|---|---|
| `PORT` | Port d'écoute du serveur HTTP | `3003` |
| `MONGO_URI` | Chaîne de connexion MongoDB propre au service | `mongodb://127.0.0.1:27017/assessment_service` |
| `QUESTION_SERVICE_GRPC_URL` | Hôte et port du serveur gRPC de `question-service` | `localhost:50052` |
| `RABBITMQ_URL` | URL de connexion au broker RabbitMQ | `amqp://localhost:5672` |

---

## 4. Architecture : CQRS et Event Sourcing

```
       Commandes (POST / PUT)                    Requêtes (GET)
                  │                                     │
                  ▼                                     ▼
        ┌───────────────────┐                 ┌───────────────────┐
        │    Write Model    │                 │    Read Model     │
        │   (commands.js)   │                 │   (queries.js)    │
        └─────────┬─────────┘                 └─────────▲─────────┘
                  │                                     │
                  ▼                                     │ Projections
        ┌───────────────────┐                 ┌─────────┴─────────┐
        │    Event Store    │ ──────────────> │ ProjectionUpdater │
        │ (AssessmentEvent) │   (événements)  │ (ReadModel Mongo) │
        └───────────────────┘                 └───────────────────┘
```

1. **Write Model (`commands.js`)** :
   Valide les règles métier invariantes (ex: impossible de publier une évaluation sans questions ou sans barème positif) et écrit un événement immuable dans l'Event Store.
2. **Event Store (`models/AssessmentEvent.js`)** :
   Journal d'ajout seul (Append-Only) contenant l'historique complet :
   - `AssessmentCreated`
   - `AssessmentUpdated`
   - `AssessmentPublished`
   - `AssessmentCancelled`
   - `GradingCompleted`
   - `ResultPublished`
3. **Read Model (`models/AssessmentReadModel.js`)** :
   Document dénormalisé matérialisant l'état courant de l'évaluation, enrichi des résultats au fil de l'eau.
4. **Reconstructibilité totale** :
   En cas de corruption ou d'évolution du schéma de lecture, l'état complet peut être recalculé depuis zéro via :
   `POST /assessments/:id/rebuild`.

---

## 5. Convention de Messaging (RabbitMQ)

- **Exchange** : `evaluations.events` (Topic, durable)
- **Événements émis (Publisher)** :
  - `assessment.published` : déclenché lors de la publication d'une évaluation. Charge utile : `{ assessmentId, titre, dateDebut, dateFin, dureeMinutes }`.
  - `assessment.closing_soon` : avertissement avant clôture.
- **Événements consommés (Consumer)** :
  - `grading.completed` : indique la fin de correction automatique.
  - `result.published` : publication officielle des notes par l'enseignant. **Règle métier** : les résultats d'un étudiant ne sont visibles dans le Read Model qu'après cet événement.

---

## 6. Installation et Démarrage

### Installation des dépendances
```bash
cd assessment-service
npm install
```

### Démarrage
```bash
npm start
```
Sortie en console :
```
[assessment-service] Connecté à MongoDB
[assessment-service] Connecté à RabbitMQ (exchange: evaluations.events)
[assessment-service] Abonné aux événements de correction sur evaluations.events
[assessment-service] En écoute sur le port 3003
```

---

## 7. API Principales

#### `GET /assessments`
Liste les évaluations projetées dans le Read Model.
- **Query params** : `enseignantId`, `status`
- **Réponse (200 OK)** : Tableau d'évaluations.

#### `POST /assessments`
Crée une évaluation en mode manuel ou automatique.
- **Corps de la requête (Mode Manuel)** :
  ```json
  {
    "titre": "Examen Partiel - Systèmes Distribués",
    "enseignantId": "660c1b...",
    "questions": ["id_question_1", "id_question_2"],
    "dateDebut": "2026-11-01T08:00:00.000Z",
    "dateFin": "2026-11-01T10:00:00.000Z",
    "dureeMinutes": 120
  }
  ```
- **Corps de la requête (Mode Auto via gRPC)** :
  ```json
  {
    "titre": "Quiz Hebdomadaire",
    "enseignantId": "660c1b...",
    "autoGeneration": {
      "subject": "Systèmes distribués",
      "count": 5,
      "difficulty": { "easy_percent": 40, "medium_percent": 40, "hard_percent": 20 },
      "themes": ["REST", "gRPC"]
    },
    "dateDebut": "2026-11-02T14:00:00.000Z",
    "dateFin": "2026-11-02T15:00:00.000Z",
    "dureeMinutes": 60
  }
  ```
- **Réponse (201 Created)** : Détail de l'évaluation créée dans l'Event Store et projetée.

#### `GET /assessments/:id`
Récupère une évaluation complète avec ses questions et son état courant.
- **Réponse (200 OK)** : Document Read Model.

#### `POST /assessments/:id/publish`
Publie l'évaluation et diffuse l'événement `assessment.published` sur RabbitMQ.
- **Réponse (200 OK)** : Évaluation au statut `PUBLIEE`.

#### `POST /assessments/:id/cancel`
Annule une évaluation.
- **Réponse (200 OK)** : Évaluation au statut `ANNULEE`.

#### `POST /assessments/:id/rebuild`
Rejoue l'Event Store de l'évaluation pour recalculer le Read Model à l'identique.
- **Réponse (200 OK)** : Projection mise à jour.

#### `GET /assessments/:id/results`
Consulte les notes et statistiques des étudiants ayant un résultat publié (`result.published`).
- **Réponse (200 OK)** :
  ```json
  {
    "assessmentId": "660c...",
    "titre": "Examen Partiel",
    "baremeTotal": 20,
    "moyenne": 14.5,
    "resultatsEtudiants": [
      {
        "etudiantId": "660c1...",
        "note": 15,
        "statut": "PUBLIE",
        "datePublication": "2026-11-01T12:00:00.000Z"
      }
    ]
  }
  ```
