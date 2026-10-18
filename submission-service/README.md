# submission-service

Microservice de gestion des soumissions d'évaluations par les étudiants, de la saisie progressive des réponses, du dépôt de fichiers (devoirs numériques) et de la validation des délais de remise.

---

## 1. Responsabilités

- **Ouverture des soumissions** : permet à un étudiant d'entamer une évaluation publiée et d'initialiser son horodatage.
- **Sauvegarde intermédiaire** : enregistrement continu des réponses aux questions (brouillon) pour éviter toute perte de travail.
- **Téléversement de devoirs** : gestion du dépôt sécurisé de pièces jointes (fichiers PDF, archives, code source).
- **Contrôle strict des délais** : comparaison entre l'horodatage de la remise et la date limite de fin d'évaluation (`dateFin`). Les soumissions tardives sont rejetées ou marquées `HORS_DELAI`.
- **Intégration de la Saga** :
  - Consomme l'événement `assessment.published` pour autoriser les soumissions sur une évaluation.
  - Émet l'événement `submission.completed` pour déclencher la correction automatique par `grading-service`.

---

## 2. Dépendances

### Infrastructure requise
- **Node.js** : version >= 20.x
- **MongoDB** : instance dédiée (base `submission_service`).
- **RabbitMQ** : broker AMQP (exchange topic `evaluations.events`).
- **Système de fichiers** : dossier local pour stocker les fichiers téléversés (`uploads/`).

### Dépendances npm principales
- `express` (^4.19.2) : serveur HTTP REST.
- `mongoose` (^8.5.0) : persistance des soumissions et de l'état des évaluations ouvertes.
- `amqplib` (^0.10.4) : communication asynchrone avec RabbitMQ.
- `multer` (^1.4.5-lts.1) : middleware de traitement des formulaires multipart (`multipart/form-data`).
- `dotenv` (^16.4.5).

---

## 3. Ports et Variables d'environnement

### Port par défaut
- **3004** (HTTP REST)

### Fichier `.env`
Créer un fichier `.env` à la racine de `submission-service` à partir de `.env.example` :

```env
PORT=3004
MONGO_URI=mongodb://127.0.0.1:27017/submission_service
RABBITMQ_URL=amqp://localhost:5672
UPLOAD_DIR=uploads
```

| Variable | Description | Valeur par défaut |
|---|---|---|
| `PORT` | Port d'écoute du serveur HTTP | `3004` |
| `MONGO_URI` | Chaîne de connexion MongoDB propre au service | `mongodb://127.0.0.1:27017/submission_service` |
| `RABBITMQ_URL` | URL de connexion au broker RabbitMQ | `amqp://localhost:5672` |
| `UPLOAD_DIR` | Répertoire de stockage des fichiers téléversés | `uploads` |

---

## 4. Cycle de Vie d'une Soumission

```
[assessment.published]
         │
         ▼
 ┌───────────────┐        POST /submissions        ┌───────────────┐
 │ OpenAssessment│ ──────────────────────────────> │   BROUILLON   │
 └───────────────┘                                 └───────┬───────┘
                                                           │
                                   PUT /answers            │
                                   POST /files             ▼
                                                   ┌───────────────┐
                                                   │ En cours de   │
                                                   │ modification  │
                                                   └───────┬───────┘
                                                           │
                                   POST /submit            │
                           ┌───────────────────────────────┴───────────────────────────────┐
                           │ (dateSoumission <= dateFin)                                   │ (dateSoumission > dateFin)
                           ▼                                                               ▼
                   ┌───────────────┐                                               ┌───────────────┐
                   │    SOUMIS     │                                               │  HORS_DELAI   │
                   └───────┬───────┘                                               └───────────────┘
                           │
                           ▼
               [submission.completed]
              (déclenche grading-service)
```

---

## 5. Convention de Messaging (RabbitMQ)

- **Exchange** : `evaluations.events` (Topic, durable)
- **Événements consommés** :
  - `assessment.published` : insère ou met à jour le modèle `OpenAssessment` local pour synchroniser la date de fin et le barème sans requêter `assessment-service` en direct.
- **Événements émis** :
  - `submission.completed` : diffusé dès qu'un étudiant valide définitivement sa copie.
    - **Payload** :
      ```json
      {
        "submissionId": "660c2...",
        "assessmentId": "660c1...",
        "etudiantId": "660c0...",
        "dateSoumission": "2026-11-01T09:45:00.000Z",
        "reponses": [
          { "questionId": "q1", "valeur": "HTTP" }
        ],
        "fichiers": [
          { "nomOriginal": "tp.zip", "chemin": "uploads/171..." }
        ]
      }
      ```

---

## 6. Installation et Démarrage

### Installation des dépendances
```bash
cd submission-service
npm install
```

### Lancement du service
```bash
npm start
```
Sortie attendue :
```
[submission-service] Connecté à MongoDB
[submission-service] Connecté à RabbitMQ (exchange: evaluations.events)
[submission-service] Abonné à assessment.published sur evaluations.events
[submission-service] En écoute sur le port 3004
```

---

## 7. API Principales

#### `GET /submissions`
Recherche des soumissions par filtres.
- **Query params** : `assessmentId`, `etudiantId`, `status` (`BROUILLON`, `SOUMIS`, `HORS_DELAI`)
- **Réponse (200 OK)** : Tableau des soumissions.

#### `POST /submissions`
Démarre une tentative sur une évaluation ouverte.
- **Corps de la requête** :
  ```json
  {
    "assessmentId": "660c1...",
    "etudiantId": "660c0..."
  }
  ```
- **Réponse (201 Created)** : Objet soumission initialisé au statut `BROUILLON`.

#### `GET /submissions/:id`
Récupère l'état courant d'une copie d'étudiant.
- **Réponse (200 OK)** : Détail complet de la soumission.

#### `PUT /submissions/:id/answers`
Sauvegarde ou met à jour les réponses saisies (mode brouillon).
- **Corps de la requête** :
  ```json
  {
    "reponses": [
      { "questionId": "660c...", "valeur": "HTTP" },
      { "questionId": "660d...", "valeur": true }
    ]
  }
  ```
- **Réponse (200 OK)** : Soumission mise à jour.

#### `POST /submissions/:id/files`
Téléverse une pièce jointe pour la copie.
- **Type de contenu** : `multipart/form-data`
- **Champ du formulaire** : `file` (limite : 10 Mo par défaut).
- **Réponse (201 Created)** : Métadonnées du fichier enregistré.

#### `POST /submissions/:id/submit`
Verrouille définitivement la soumission, vérifie la date limite et publie `submission.completed`.
- **Réponse (200 OK)** : Soumission passée à `SOUMIS` (ou erreur `400` / statut `HORS_DELAI` si la date limite est expirée).
