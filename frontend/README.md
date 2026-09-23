# frontend

Interface web (React) de la plateforme de gestion des évaluations —
côté enseignant pour l'instant (banque de questions, évaluations,
résultats).

## Design

Système de design inspiré d'une référence dashboard fintech (coque
arrondie, sidebar d'icônes, cartes blanches, vert forêt `#163832` /
vert accent `#2F9E68`), adapté au domaine métier. Tokens dans
`src/styles/tokens.css`. Pas de librairie de composants (MUI/AntD…) :
CSS écrit à la main pour garder un rendu distinctif.

## Démarrage

```bash
npm install
npm run dev
```

Ouvre `http://localhost:5173`.

En dev, Vite proxifie directement vers les services (pas encore
d'api-gateway) :
- `/api/questions/*` → `question-service` (`http://localhost:3002`)
- `/api/assessments/*` → `assessment-service` (`http://localhost:3003`,
  préfixe `/api` retiré)

Voir `vite.config.js`. Il faut donc lancer `question-service` et
`assessment-service` (MongoDB requis, voir leurs README) avant de
tester les pages Questions/Évaluations/Résultats.

## Structure

```
src/
  api/            client fetch + fonctions par service (questions, assessments)
  components/
    layout/       AppShell, Sidebar, Topbar
    ui/           Card, Badge, Button, StatCard, StateBlock (design system)
  constants/      libellés et énumérations partagés (statuts, difficultés, types)
  pages/          Dashboard, Questions, Assessments, Results, Login
```

## État d'implémentation

- [x] Dashboard : statistiques réelles (questions, évaluations, barème),
      graphique par évaluation, historique — aucune donnée inventée
- [x] Questions : liste + filtres + création + suppression (douce)
- [x] Évaluations : liste + création (manuelle ou génération auto avec
      répartition par difficulté) + publication + annulation
- [x] Résultats : sélection d'une évaluation, moyenne, résultats
      individuels (visibles uniquement après `result.published`)
- [ ] Login : formulaire présent mais **non branché** — `user-service`
      (authentification, rôles) n'existe pas encore côté backend
- [ ] Vue étudiant (réalisation d'une évaluation, dépôt de fichier) :
      dépend de `submission-service`, pas encore implémenté
- [ ] Sélecteur de questions dans le formulaire manuel d'évaluation :
      actuellement une saisie d'IDs séparés par virgule — à remplacer
      par une vraie recherche/sélection une fois le temps disponible
