# user-service

Microservice de gestion des utilisateurs, de l'authentification et du contrôle d'accès basé sur les rôles (RBAC) pour la plateforme d'évaluations.

---

## 1. Responsabilités

- Gestion du cycle de vie des utilisateurs (création, modification, consultation, activation/désactivation).
- Authentification locale par mot de passe hashé (bcrypt) et émission de jetons JWT.
- Définition et attribution des rôles : `ADMINISTRATEUR`, `ENSEIGNANT`, `ETUDIANT`.
- Fourniture des profils utilisateurs aux autres services et au frontend.

---

## 2. Dépendances

### Infrastructure requise
- **Node.js** : version >= 20.x
- **MongoDB** : instance locale ou distante dédiée (base `user_service`).

### Dépendances npm principales
- `express` (^4.19.2) : framework HTTP pour l'API REST.
- `mongoose` (^8.5.0) : ODM pour la modélisation et persistance MongoDB.
- `bcryptjs` (^2.4.3) : hachage salé des mots de passe.
- `jsonwebtoken` (^9.0.2) : génération et signature des tokens JWT.
- `dotenv` (^16.4.5) : chargement des variables d'environnement.

---

## 3. Ports et Variables d'environnement

### Port par défaut
- **3001** (HTTP REST)

### Fichier `.env`
Créer un fichier `.env` à la racine de `user-service` à partir de `.env.example` :

```env
PORT=3001
MONGO_URI=mongodb://127.0.0.1:27017/user_service
JWT_SECRET=change-me-en-dev
JWT_EXPIRES_IN=8h
```

| Variable | Description | Valeur par défaut |
|---|---|---|
| `PORT` | Port d'écoute du serveur HTTP | `3001` |
| `MONGO_URI` | Chaîne de connexion MongoDB propre au service | `mongodb://127.0.0.1:27017/user_service` |
| `JWT_SECRET` | Clé secrète de signature des JWT (doit être identique à celle de l'`api-gateway`) | `change-me-en-dev` |
| `JWT_EXPIRES_IN` | Durée de validité des jetons émis | `8h` |

---

## 4. Installation et Démarrage

### Installation des dépendances
```bash
cd user-service
npm install
```

### Initialisation de la base de données (Seed)
Crée les comptes de test initiaux s'ils n'existent pas encore :
```bash
npm run seed
```

### Lancement du service
```bash
npm start
```
Le service démarre et affiche :
```
[user-service] Connecté à MongoDB (mongodb://127.0.0.1:27017/user_service)
[user-service] En écoute sur le port 3001
```

---

## 5. Comptes de test

Le script `npm run seed` (`src/scripts/seed.js`) initialise un compte pour chaque rôle de la plateforme :

| Rôle | Email | Mot de passe | Nom complet | Permissions |
|---|---|---|---|---|
| `ADMINISTRATEUR` | `admin@evaluations.local` | `admin123` | Plateforme Admin | Gestion complète des comptes et statuts |
| `ENSEIGNANT` | `enseignant@evaluations.local` | `enseignant123` | Diop Awa | Consultation des listes d'étudiants, création d'évaluations |
| `ETUDIANT` | `etudiant@evaluations.local` | `etudiant123` | Ndiaye Moussa | Consultation de son profil et passage des évaluations |

---

## 6. API principales

Toutes les requêtes protégées requièrent l'en-tête HTTP :
`Authorization: Bearer <token_jwt>`

### Authentification

#### `POST /auth/login`
Authentifie un utilisateur et retourne un jeton JWT.
- **Accès** : Public
- **Corps de la requête** :
  ```json
  {
    "email": "enseignant@evaluations.local",
    "password": "enseignant123"
  }
  ```
- **Réponse (200 OK)** :
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "660c1b...",
      "email": "enseignant@evaluations.local",
      "nom": "Diop",
      "prenom": "Awa",
      "role": "ENSEIGNANT",
      "active": true
    }
  }
  ```

---

### Gestion des Utilisateurs

#### `GET /users`
Retourne la liste des utilisateurs selon des filtres optionnels.
- **Accès** : `ADMINISTRATEUR`, `ENSEIGNANT`
- **Paramètres Query** :
  - `role` (ex: `ETUDIANT`, `ENSEIGNANT`)
  - `active` (`true` | `false`)
- **Réponse (200 OK)** : Tableau d'utilisateurs trié par nom/prénom.

#### `POST /users`
Crée un nouvel utilisateur.
- **Accès** : `ADMINISTRATEUR` uniquement
- **Corps de la requête** :
  ```json
  {
    "email": "nouvel.etudiant@evaluations.local",
    "password": "password123",
    "nom": "Sow",
    "prenom": "Fatou",
    "role": "ETUDIANT"
  }
  ```
- **Réponse (201 Created)** : Détails de l'utilisateur créé.

#### `GET /users/:id`
Récupère les détails d'un utilisateur par son identifiant.
- **Accès** : `ADMINISTRATEUR` ou l'utilisateur concerné lui-même (`req.user.id === id`).
- **Réponse (200 OK)** : Objet utilisateur sans hash de mot de passe.

#### `PUT /users/:id`
Met à jour les informations d'un utilisateur (nom, prénom, rôle).
- **Accès** : `ADMINISTRATEUR` uniquement
- **Corps de la requête** :
  ```json
  {
    "nom": "Sow",
    "prenom": "Fatoumata",
    "role": "ETUDIANT"
  }
  ```
- **Réponse (200 OK)** : Objet utilisateur mis à jour.

#### `PATCH /users/:id/status`
Active ou désactive un compte utilisateur.
- **Accès** : `ADMINISTRATEUR` uniquement (un administrateur ne peut pas désactiver son propre compte).
- **Corps de la requête** :
  ```json
  {
    "active": false
  }
  ```
- **Réponse (200 OK)** : Objet utilisateur avec le statut actualisé.
