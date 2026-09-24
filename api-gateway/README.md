# api-gateway

## Responsabilité
- Point d'entrée unique pour les clients (frontend enseignant/étudiant)
- Routage vers les microservices
- Authentification centralisée : vérifie le JWT émis par `user-service`
  (même `JWT_SECRET`) et transmet l'identité aux services via les
  en-têtes `X-User-Id` / `X-User-Role` (les en-têtes `X-User-*` envoyés
  par le client sont supprimés)

## Routes (port 3000)

| Préfixe | Service | Accès |
|---|---|---|
| `/api/auth/*` | user-service (`/auth/*`) | public |
| `/api/users/*` | user-service (`/users/*`) | authentifié (droits fins dans user-service) |
| `/api/questions/*` | question-service (`/api/questions/*`) | lecture : authentifié ; écriture : Enseignant/Admin |
| `/api/assessments/*` | assessment-service (`/assessments/*`) | lecture : authentifié ; écriture : Enseignant/Admin |
| `/api/submissions/*` | submission-service (`/submissions/*`) | authentifié |
| `/api/uploads/*` | submission-service (`/uploads/*`) | authentifié |
| `/api/gradings/*` | grading-service (`/gradings/*`) | Enseignant/Admin |

Service injoignable → `502`, route inconnue → `404`.

## Lancer

```bash
cp .env.example .env   # JWT_SECRET identique à celui de user-service
npm install
npm start
```

## Communication
- REST
