# grading-service

Microservice de correction automatique et manuelle des évaluations, d'attribution des notes et de publication officielle des résultats pour les étudiants.

---

## 1. Responsabilités

- **Correction automatique** : évaluation instantanée des questions fermées (`QCM`, `VRAI_FAUX`, `QUESTION_COURTE`) dès réception d'une soumission.
- **Support de la correction manuelle** : interface et endpoints permettant aux enseignants de noter et commenter les questions ouvertes (`QUESTION_OUVERTE`) et devoirs téléversés.
- **Agrégation des scores** : calcul du total des points obtenus et comparaison avec le barème global.
- **Rôle pivot dans la Saga chorégraphiée** :
  - Consomme l'événement `submission.completed` de `submission-service`.
  - Émet `grading.completed` une fois le traitement automatique achevé.
  - Émet `result.published` lors de la validation définitive par l'enseignant, ce qui débloque la visibilité des notes côté `assessment-service` et notifie l'étudiant via `notification-service`.

---

## 2. Dépendances

### Infrastructure requise
- **Node.js** : version >= 20.x
- **MongoDB** : instance dédiée (base `grading_service`).
- **RabbitMQ** : broker AMQP (exchange topic `evaluations.events`).
- **Microservices en amont** :
  - `assessment-service` (port 3003) : pour récupérer la configuration des questions de l'évaluation.
  - `question-service` (port 3002) : pour récupérer les réponses attendues et critères de correction.

### Dépendances npm principales
- `express` (^4.19.2) : serveur HTTP REST.
- `mongoose` (^8.5.0) : persistance des corrections et des notes attribuées.
- `amqplib` (^0.10.4) : communication par messages avec RabbitMQ.
- `dotenv` (^16.4.5).

---

## 3. Ports et Variables d'environnement

### Port par défaut
- **3005** (HTTP REST)

### Fichier `.env`
Créer un fichier `.env` à la racine de `grading-service` à partir de `.env.example` :

```env
PORT=3005
MONGO_URI=mongodb://127.0.0.1:27017/grading_service
RABBITMQ_URL=amqp://localhost:5672
ASSESSMENT_SERVICE_URL=http://localhost:3003
QUESTION_SERVICE_URL=http://localhost:3002
```

| Variable | Description | Valeur par défaut |
|---|---|---|
| `PORT` | Port d'écoute du serveur HTTP | `3005` |
| `MONGO_URI` | Chaîne de connexion MongoDB propre au service | `mongodb://127.0.0.1:27017/grading_service` |
| `RABBITMQ_URL` | URL de connexion au broker RabbitMQ | `amqp://localhost:5672` |
| `ASSESSMENT_SERVICE_URL` | Adresse du service d'évaluations | `http://localhost:3003` |
| `QUESTION_SERVICE_URL` | Adresse du service de questions | `http://localhost:3002` |

---

## 4. Fonctionnement du Moteur de Correction

```
 [submission.completed]
           │
           ▼
  ┌─────────────────┐       Appels REST       ┌───────────────────────────────┐
  │   autoGrader    │ ──────────────────────> │ question-service (réponses)   │
  │ (Auto-correction│                         │ assessment-service (barème)   │
  └────────┬────────┘                         └───────────────────────────────┘
           │
           ├─ QCM / VRAI_FAUX / COURTE : Note attribuée automatiquement
           └─ QUESTION_OUVERTE : Marquée en attente de correction manuelle
           │
           ▼
  [grading.completed]
           │
           ▼ (si questions ouvertes à corriger)
  ┌─────────────────────────────────────────────────────────────┐
  │ Intervention de l'enseignant :                              │
  │ PUT /gradings/:submissionId/questions/:questionId (note)    │
  │ POST /gradings/:submissionId/validate (validation finale)   │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
                        [result.published]
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
        assessment-service              notification-service
      (met à jour Read Model)          (envoie notification)
```

---

## 5. Convention de Messaging (RabbitMQ)

- **Exchange** : `evaluations.events` (Topic, durable)
- **Événements consommés** :
  - `submission.completed` : déclenche la création du document `Grading` et le calcul des réponses automatisées.
- **Événements émis** :
  - `grading.completed` : notifie que la phase automatisée est terminée (statut `AUTO_CORRIGE` ou `EN_ATTENTE_MANUELLE`).
  - `result.published` : émis lorsque la copie est validée par l'enseignant.
    - **Payload** :
      ```json
      {
        "assessmentId": "660c1...",
        "submissionId": "660c2...",
        "etudiantId": "660c0...",
        "noteObtenue": 16.5,
        "baremeTotal": 20,
        "datePublication": "2026-11-01T11:00:00.000Z"
      }
      ```

---

## 6. Installation et Démarrage

### Installation des dépendances
```bash
cd grading-service
npm install
```

### Lancement du service
```bash
npm start
```
Sortie en console :
```
[grading-service] Connecté à MongoDB
[grading-service] Connecté à RabbitMQ (exchange: evaluations.events)
[grading-service] Abonné à submission.completed sur evaluations.events
[grading-service] En écoute sur le port 3005
```

---

## 7. API Principales

#### `GET /gradings/pending`
Récupère les copies nécessitant une correction manuelle par l'enseignant.
- **Query params** : `assessmentId`, `enseignantId`
- **Réponse (200 OK)** : Tableau de copies en attente.

#### `GET /gradings/:submissionId`
Consulte le détail de la correction d'une soumission.
- **Réponse (200 OK)** : Objet `Grading` détaillé par question avec commentaires.

#### `PUT /gradings/:submissionId/questions/:questionId`
Attribue une note et un commentaire pour une question spécifique (généralement question ouverte).
- **Corps de la requête** :
  ```json
  {
    "points": 4.5,
    "commentaire": "Bonne explication du pattern Saga chorégraphié."
  }
  ```
- **Réponse (200 OK)** : Objet `Grading` actualisé.

#### `POST /gradings/:submissionId/validate`
Valide la correction de la copie, verrouille les notes et émet l'événement `result.published`.
- **Réponse (200 OK)** :
  ```json
  {
    "submissionId": "660c2...",
    "statut": "PUBLIE",
    "scoreTotal": 17,
    "baremeTotal": 20,
    "validePar": "660c1b..."
  }
  ```
