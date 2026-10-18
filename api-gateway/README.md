# api-gateway

Passerelle d'API (API Gateway) et point d'entrée unique pour la plateforme de gestion des évaluations. Elle centralise l'authentification, le contrôle d'accès aux ressources et le routage reverse-proxy vers chaque microservice backend.

---

## 1. Responsabilités

- **Point d'entrée unique** : expose une interface unifiée sous le préfixe `/api` pour les clients frontend (web, mobile).
- **Authentification centralisée** : valide les jetons JWT émis par `user-service` via un secret partagé (`JWT_SECRET`).
- **Sécurisation des identités (Anti-Spoofing)** : supprime systématiquement les en-têtes `X-User-Id` et `X-User-Role` fournis par le client, puis injecte les claims certifiés du JWT vers les services en aval.
- **Contrôle d'accès par rôle (RBAC)** : applique un filtrage préalable sur les routes réservées au corps enseignant et administrateurs (`ADMINISTRATEUR`, `ENSEIGNANT`).
- **Reverse Proxying** : réécrit les chemins (path rewriting) et transfère les requêtes HTTP/REST vers les microservices cibles correspondants.
- **Gestion des pannes** : intercepte les indisponibilités des microservices en aval et renvoie une réponse normalisée `502 Service indisponible`.

---

## 2. Dépendances

### Infrastructure requise
- **Node.js** : version >= 20.x
- **Microservices cibles** : requiert que les services correspondants soient accessibles via HTTP (en local ou sur le réseau de conteneurs).

### Dépendances npm principales
- `express` (^4.19.2) : serveur HTTP et moteur de routage.
- `http-proxy-middleware` (^3.0.0) : délégation et réécriture des flux HTTP vers les services cibles.
- `jsonwebtoken` (^9.0.2) : décodage et vérification cryptographique des signatures JWT.
- `cors` (^2.8.5) : gestion des requêtes Cross-Origin Resource Sharing pour le frontend.
- `dotenv` (^16.4.5) : chargement des configurations d'environnement.

---

## 3. Ports et Variables d'environnement

### Port par défaut
- **3000** (HTTP REST)

### Fichier `.env`
Créer un fichier `.env` à la racine de `api-gateway` à partir de `.env.example` :

```env
PORT=3000
JWT_SECRET=change-me-en-dev
USER_SERVICE_URL=http://localhost:3001
QUESTION_SERVICE_URL=http://localhost:3002
ASSESSMENT_SERVICE_URL=http://localhost:3003
SUBMISSION_SERVICE_URL=http://localhost:3004
GRADING_SERVICE_URL=http://localhost:3005
```

| Variable | Description | Valeur par défaut |
|---|---|---|
| `PORT` | Port d'écoute de la passerelle | `3000` |
| `JWT_SECRET` | Clé secrète de vérification (identique à `user-service`) | `change-me-en-dev` |
| `USER_SERVICE_URL` | URL de destination pour `user-service` | `http://localhost:3001` |
| `QUESTION_SERVICE_URL` | URL de destination pour `question-service` | `http://localhost:3002` |
| `ASSESSMENT_SERVICE_URL` | URL de destination pour `assessment-service` | `http://localhost:3003` |
| `SUBMISSION_SERVICE_URL` | URL de destination pour `submission-service` | `http://localhost:3004` |
| `GRADING_SERVICE_URL` | URL de destination pour `grading-service` | `http://localhost:3005` |

---

## 4. Installation et Démarrage

### Installation des dépendances
```bash
cd api-gateway
npm install
```

### Lancement du service
```bash
npm start
```

Vérifier la disponibilité :
```bash
curl http://localhost:3000/health
# {"status":"ok","service":"api-gateway"}
```

---

## 5. Matrice de Routage et Permissions

| Route Gateway | Service Cible | Réécriture d'URL | Niveau d'accès | Rôles autorisés |
|---|---|---|---|---|
| `/health` | api-gateway | Aucun | Public | Tous |
| `/api/auth/*` | `user-service` | `/auth/*` | Public | Tous (Login) |
| `/api/users/*` | `user-service` | `/users/*` | Authentifié | Rôles gérés par `user-service` |
| `/api/questions/*` | `question-service` | `/api/questions/*` | Lecture : Authentifié<br>Écriture (POST, PUT, DELETE) : Filtré | `ADMINISTRATEUR`, `ENSEIGNANT` (pour écriture) |
| `/api/assessments/*` | `assessment-service` | `/assessments/*` | Lecture : Authentifié<br>Écriture (POST, PUT, DELETE) : Filtré | `ADMINISTRATEUR`, `ENSEIGNANT` (pour écriture) |
| `/api/submissions/*` | `submission-service` | `/submissions/*` | Authentifié | Tous utilisateurs connectés |
| `/api/uploads/*` | `submission-service` | `/uploads/*` | Authentifié | Tous utilisateurs connectés |
| `/api/gradings/*` | `grading-service` | `/gradings/*` | Filtré | `ADMINISTRATEUR`, `ENSEIGNANT` |

---

## 6. Mécanisme d'Authentification et En-têtes Transmis

1. Le client transmet le token dans l'en-tête standard :
   ```http
   Authorization: Bearer <token_jwt>
   ```
2. La Gateway vérifie l'authenticité et la date d'expiration du token.
3. Si le token est valide, la Gateway injecte dans la requête transmise au microservice cible :
   - `X-User-Id` : identifiant Mongo de l'utilisateur (`claims.sub`).
   - `X-User-Role` : rôle attribué (`ADMINISTRATEUR`, `ENSEIGNANT`, `ETUDIANT`).
4. Si le microservice cible est éteint ou inaccessible, la passerelle retourne :
   ```json
   {
     "message": "Service indisponible"
   }
   ```
   avec le code HTTP `502 Bad Gateway`.
