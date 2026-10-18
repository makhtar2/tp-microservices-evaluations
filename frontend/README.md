# frontend

Interface utilisateur web moderne (Single Page Application - React 19) de la plateforme de gestion des évaluations. Elle offre aux enseignants un espace complet pour la gestion de leur banque de questions, la planification et publication d'évaluations, et le suivi analytique des résultats.

---

## 1. Responsabilités

- **Tableau de bord (Dashboard)** : synthèse visuelle en temps réel des questions actives, des évaluations créées, de la moyenne générale et répartition des barèmes.
- **Banque de questions** : recherche, filtrage multicritère (matière, type, difficulté), formulaire de création interactive multitype et suppression douce.
- **Gestion des évaluations** :
  - Création manuelle par assemblage de questions existantes.
  - Génération automatique assistée par tirage pondéré (gRPC en arrière-plan).
  - Gestion du cycle de publication et d'annulation.
- **Consultation des résultats** : sélection d'une évaluation terminée, calcul des moyennes et affichage des notes individuelles publiées (`result.published`).
- **Authentification & Rôles** : intégration avec le système d'authentification centralisé de la plateforme.

---

## 2. Dépendances

### Infrastructure requise
- **Node.js** : version >= 20.x
- **Microservices requis pour tests locaux** :
  - `api-gateway` (port 3000) en environnement complet, OU
  - `question-service` (port 3002) et `assessment-service` (port 3003) en dev direct via le proxy Vite.

### Dépendances npm principales
- `react` (^19.2.8) & `react-dom` (^19.2.8) : bibliothèque UI déclarative.
- `vite` (^8.3.0) & `@vitejs/plugin-react` (^6.1.1) : outillage de build et serveur de développement ultra-rapide.
- `tailwindcss` (^4.3.3) & `@tailwindcss/vite` (^4.3.3) : framework CSS utilitaire moderne de dernière génération (CSS-first, sans fichier JS de configuration).
- `react-router-dom` (^7.18.4) : routage applicatif client.
- `lucide-react` (^1.47.0) : bibliothèque d'iconographie vectorielle.
- `recharts` (^3.10.1) : graphiques statistiques interactifs.

---

## 3. Ports et Configuration Réseau

### Port par défaut
- **5173** (Serveur de développement Vite)

### Configuration du Proxy de développement (`vite.config.js`)
Par défaut, le serveur de développement relaie les requêtes `/api` directement vers les services locaux correspondants :
- `/api/questions/*` $\rightarrow$ `http://localhost:3002` (`question-service`)
- `/api/assessments/*` $\rightarrow$ `http://localhost:3003` (`assessment-service`, préfixe `/api` retiré)

En mode intégré avec la passerelle, l'ensemble des appels peut pointer vers l'`api-gateway` sur `http://localhost:3000`.

---

## 4. Installation et Démarrage

### Installation des dépendances
```bash
cd frontend
npm install
```

### Lancement en mode développement
```bash
npm run dev
```
L'application devient accessible sur : **http://localhost:5173**

### Compilation pour la production
```bash
npm run build
```
Les fichiers statiques optimisés sont générés dans le dossier `dist/`.

---

## 5. Comptes de Test pour l'Interface

Pour explorer les fonctionnalités de l'interface, les comptes par défaut issus du seed de `user-service` sont les suivants :

| Rôle | Email | Mot de passe | Accès interface |
|---|---|---|---|
| `ENSEIGNANT` | `enseignant@evaluations.local` | `enseignant123` | Dashboard, Questions, Évaluations, Résultats |
| `ADMINISTRATEUR` | `admin@evaluations.local` | `admin123` | Accès global et administration |
| `ETUDIANT` | `etudiant@evaluations.local` | `etudiant123` | Consultation et passage des évaluations |

---

## 6. Architecture du Code Source

```
frontend/src/
├── api/             # Couche d'abstraction HTTP (fetch vers /api/questions, /api/assessments)
├── components/
│   ├── layout/      # AppShell (coque applicative), Sidebar de navigation, Topbar
│   └── ui/          # Système de composants maison (Card, Badge, Button, StatCard, StateBlock)
├── constants/       # Énumérations partagées (statuts d'évaluations, types de questions, difficultés)
├── pages/           # Vues principales (Dashboard, Questions, Assessments, Results, Login)
├── App.jsx          # Configuration des routes React Router
├── index.css        # Système de tokens Tailwind v4 (@theme, @apply)
└── main.jsx         # Point d'entrée de montage du DOM
```

---

## 7. Fonctionnalités Implémentées

- [x] **Dashboard analytique** : calcul des indicateurs en temps réel (total questions, évaluations en cours, moyennes réelles, historique d'activité).
- [x] **Banque de questions** : recherche textuelle instantanée, filtrage par matière et difficulté, formulaire de création multitype (QCM, Vrai/Faux, courte, ouverte).
- [x] **Gestion des évaluations** :
  - Création manuelle avec association des questions.
  - Création automatique avec curseurs de difficulté (Facile / Moyen / Difficile) via appel gRPC backend.
  - Publication immédiate sur RabbitMQ et annulation.
- [x] **Résultats et Notes** : consultation par évaluation des notes des étudiants dès diffusion de l'événement `result.published`.
