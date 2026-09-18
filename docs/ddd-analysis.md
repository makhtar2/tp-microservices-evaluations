# Analyse DDD — Plateforme de gestion des évaluations

## Domaine métier

Gérer le cycle de vie complet d'une évaluation pédagogique : de la
constitution d'une banque de questions par l'enseignant jusqu'à la
publication des résultats à l'étudiant, en passant par la planification,
la réalisation et la correction.

## Sous-domaines

| Sous-domaine | Type | Justification |
|---|---|---|
| Gestion des utilisateurs | Support | Nécessaire mais non différenciant : auth, rôles, profils |
| Banque de questions | Cœur (Core) | Valeur métier : constitution et réutilisation de contenu pédagogique |
| Conception d'évaluation | Cœur (Core) | Sélection/génération des questions, planification, publication |
| Réalisation / Soumission | Cœur (Core) | Expérience étudiant, intégrité des soumissions (délais, horodatage) |
| Correction | Cœur (Core) | Correction auto + manuelle, notation |
| Notification | Générique (Generic) | Diffusion d'événements, remplaçable par une solution standard |

## Bounded Contexts

Chaque Bounded Context correspond à un microservice (alignement 1:1),
conformément à la règle « chaque microservice possède ses propres
données ».

### 1. User Context (`user-service`)
- **Entités** : `User`, `Role`
- **Responsabilité** : authentification, création d'utilisateurs, gestion
  des rôles (Administrateur, Enseignant, Étudiant), profils

### 2. Question Context (`question-service`)
- **Entités** : `Question`, `AnswerKey` (réponse attendue), `Correction`
- **Value Objects** : `Difficulty` (facile/moyen/difficile), `QuestionType`
  (QCM, Vrai/Faux, Question courte, Question ouverte)
- **Responsabilité** : banque de questions (CRUD, recherche, filtre),
  sélection de questions selon des critères

### 3. Assessment Context (`assessment-service`)
- **Entités** : `Assessment` (agrégat racine), `AssessmentQuestion` (référence
  vers une question + barème)
- **Value Objects** : `Schedule` (dates début/fin), `AssessmentStatus`
  (BROUILLON, PLANIFIÉE, PUBLIÉE, EN_COURS, TERMINÉE, CORRIGÉE)
- **Responsabilité** : construction, planification, publication de
  l'évaluation

### 4. Submission Context (`submission-service`)
- **Entités** : `Submission` (agrégat racine), `StudentAnswer`, `FileDeposit`
- **Responsabilité** : réalisation de l'évaluation côté étudiant, dépôt de
  fichiers, soumission horodatée

### 5. Grading Context (`grading-service`)
- **Entités** : `Grade` (agrégat racine), `Comment`
- **Responsabilité** : correction automatique (comparaison réponse/attendu)
  et manuelle (note + commentaire)

### 6. Notification Context (`notification-service`)
- **Entités** : `Notification`
- **Responsabilité** : abonnement aux événements métier et diffusion aux
  utilisateurs concernés

## Entités partagées entre contextes

Aucune entité n'est partagée directement (pas de Shared Kernel). Les
contextes s'échangent uniquement des **identifiants** (`userId`,
`questionId`, `assessmentId`) et des **événements métier**, jamais leurs
modèles internes.

## Context Map

```
User ──────────────(Conformist: JWT/claims)──────────────▶ tous les contextes
Question ◀──(Customer/Supplier via gRPC SelectQuestions)── Assessment
Assessment ──(Published Language: AssessmentPublished)───▶ Submission
Submission ──(Published Language: SubmissionCompleted)───▶ Grading
Grading ─────(Published Language: GradingCompleted)──────▶ Notification
Assessment/Submission/Grading ─(Published Language)──────▶ Notification
```

- **Assessment → Question** : relation Client/Fournisseur synchrone
  (gRPC). Assessment dépend du contrat exposé par Question mais ne
  connaît pas son modèle interne.
- **Assessment → Submission**, **Submission → Grading**,
  **Grading/Assessment/Submission → Notification** : intégration par
  **Published Language** (événements métier), aucun couplage direct.
- **User** : chaque service valide localement les claims du token émis
  par `user-service` (pattern Conformist côté consommateurs), évitant un
  appel synchrone systématique.

## Événements de domaine

| Événement | Émis par | Consommé par |
|---|---|---|
| `AssessmentPublished` | assessment-service | submission-service, notification-service |
| `SubmissionCompleted` | submission-service | grading-service, notification-service |
| `AssessmentClosingSoon` | assessment-service | notification-service |
| `GradingCompleted` | grading-service | notification-service, assessment-service (Read Model) |
| `ResultPublished` | grading-service | notification-service, assessment-service (Read Model) |
