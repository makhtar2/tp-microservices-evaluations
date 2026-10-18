# question-service

Microservice de gestion de la banque de questions, de leurs métadonnées, barèmes et corrections. Il expose une API REST pour l'administration et un serveur gRPC synchrone haute performance consommé par `assessment-service` pour la génération automatisée d'évaluations.

---

## 1. Responsabilités

- **Banque de questions** : création, modification, suppression douce et consultation des questions pédagogiques.
- **Support multitype** : prise en charge des questions à choix multiples (`QCM`), `VRAI_FAUX`, `QUESTION_COURTE` et `QUESTION_OUVERTE`.
- **Classification et barème** : association d'une matière (`subject`), d'un chapitre/thème (`chapter`), d'un niveau de difficulté (`FACILE`, `MOYEN`, `DIFFICILE`) et d'un barème de points.
- **Référentiel de correction** : stockage sécurisé des réponses attendues et critères de correction (utilisés par `grading-service`).
- **Sélection gRPC synchrone** : algorithme de tirage respectant une répartition pondérée par niveau de difficulté et thématiques pour `assessment-service`.

---

## 2. Dépendances

### Infrastructure requise
- **Node.js** : version >= 20.x
- **MongoDB** : instance dédiée (base `question_service`).

### Dépendances npm principales
- `express` (^4.19.2) : serveur HTTP exposant l'API REST sous `/api/questions`.
- `@grpc/grpc-js` (^1.10.9) & `@grpc/proto-loader` (^0.7.13) : implémentation du serveur gRPC et chargement du fichier `.proto`.
- `mongoose` (^8.5.0) : ODM pour la persistance des questions.
- `cors` (^2.8.5) : gestion des origines cross-domain.
- `dotenv` (^16.4.5) : chargement des variables d'environnement.

---

## 3. Ports et Variables d'environnement

### Ports par défaut
- **3002** (API REST HTTP)
- **50052** (Serveur gRPC)

### Fichier `.env`
Créer un fichier `.env` à la racine de `question-service` à partir de `.env.example` :

```env
PORT=3002
GRPC_PORT=50052
MONGO_URI=mongodb://127.0.0.1:27017/question_service
```

| Variable | Description | Valeur par défaut |
|---|---|---|
| `PORT` | Port d'écoute du serveur HTTP REST | `3002` |
| `GRPC_PORT` | Port d'écoute du service RPC gRPC | `50052` |
| `MONGO_URI` | Chaîne de connexion MongoDB propre au service | `mongodb://127.0.0.1:27017/question_service` |

---

## 4. Installation et Démarrage

### Installation des dépendances
```bash
cd question-service
npm install
```

### Initialisation des questions de test (Seed)
Insère un jeu complet de questions réparties sur différentes difficultés et types :
```bash
node src/scripts/seed.js
```
Sortie attendue :
```
[seed] Connecté à MongoDB
[seed] 7 questions insérées.
```

### Lancement du service
```bash
npm start
```
Le serveur démarre ses deux interfaces :
```
[question-service] Connecté à MongoDB
[question-service] REST en écoute sur http://localhost:3002/api
[question-service] gRPC en écoute sur 0.0.0.0:50052
```

### Test unitaire de la sélection gRPC
Pour valider le fonctionnement gRPC isolément sans lancer `assessment-service` :
```bash
node src/scripts/testSelectQuestions.js
```

---

## 5. Règles Métier Appliquées

1. **Suppression douce (Soft Delete)** :
   - L'appel `DELETE /api/questions/:id` bascule le flag `active` à `false`.
   - Aucun document n'est physiquement détruit afin de ne pas corrompre les évaluations historiques qui référencent cette question.
2. **Filtrage par défaut** :
   - `GET /api/questions` ignore systématiquement les questions inactives (`active: false`) à moins de préciser explicitement `includeInactive=true`.
3. **Sélection automatique (`SelectQuestions`)** :
   - Ne sélectionne jamais de questions inactives.
   - Si le volume de questions en base est insuffisant pour honorer la répartition demandée, l'indicateur `fully_satisfied` retourne `false`.

---

## 6. API Principales

### Endpoints REST (`/api/questions`)

#### `GET /api/questions`
Liste les questions de la banque avec filtres multicritères.
- **Query params** :
  - `subject` : matière (ex: `Systèmes distribués`)
  - `chapter` : chapitre (ex: `REST`, `Microservices`)
  - `difficulty` : `FACILE`, `MOYEN`, `DIFFICILE`
  - `type` : `QCM`, `VRAI_FAUX`, `QUESTION_COURTE`, `QUESTION_OUVERTE`
  - `includeInactive` : `true` pour inclure les questions archivées
- **Réponse (200 OK)** : Tableau d'objets questions.

#### `POST /api/questions`
Crée une nouvelle question.
- **Corps de la requête (Exemple QCM)** :
  ```json
  {
    "statement": "Quel protocole est utilisé pour la communication synchrone REST ?",
    "type": "QCM",
    "subject": "Systèmes distribués",
    "chapter": "REST",
    "difficulty": "FACILE",
    "points": 2,
    "answers": [
      { "text": "HTTP", "isCorrect": true },
      { "text": "FTP", "isCorrect": false }
    ]
  }
  ```
- **Réponse (201 Created)** : Question créée avec son `_id`.

#### `GET /api/questions/:id`
Récupère les détails complets d'une question.
- **Réponse (200 OK)** : Objet question incluant réponses et critères de correction.

#### `PUT /api/questions/:id`
Met à jour les données ou le barème d'une question.
- **Réponse (200 OK)** : Document mis à jour.

#### `DELETE /api/questions/:id`
Désactive une question (archivage doux).
- **Réponse (200 OK)** : `{ "message": "Question désactivée", "question": { ... } }`

---

### Contrat de Service gRPC (`SelectQuestions`)

Contrat défini dans [`docs/protos/question.proto`](../docs/protos/question.proto) :

```protobuf
service QuestionService {
  rpc SelectQuestions (SelectQuestionsRequest) returns (SelectQuestionsResponse);
}
```

- **Requête (`SelectQuestionsRequest`)** :
  ```json
  {
    "subject": "Systèmes distribués",
    "count": 5,
    "difficulty": {
      "easy_percent": 40,
      "medium_percent": 40,
      "hard_percent": 20
    },
    "themes": ["REST", "gRPC", "Microservices"]
  }
  ```
- **Réponse (`SelectQuestionsResponse`)** :
  - `questions` : Liste allégée des questions (`id`, `statement`, `type`, `subject`, `chapter`, `difficulty`, `points`) sans divulguer les réponses ni la correction.
  - `fully_satisfied` : Booléen (`true` si le quota exact a pu être réuni).
