# Cahier de conception — Plateforme de gestion des évaluations

## 1. Présentation du problème

Un établissement d'enseignement supérieur souhaite une plateforme
centralisée, modulaire et évolutive permettant :
- aux enseignants de constituer une banque de questions, créer,
  planifier et publier des évaluations, puis corriger les copies ;
- aux étudiants de réaliser les évaluations auxquelles ils sont
  inscrits, déposer leurs réponses/fichiers et consulter leurs résultats.

La plateforme couvre l'ensemble du cycle de vie d'une évaluation :
création des questions → construction → planification → publication →
réalisation → soumission → correction → résultats.

## 2. Acteurs

### Enseignant
Gère sa banque de questions, crée et planifie des évaluations, les
publie ou les annule, consulte les soumissions, corrige (auto + manuel),
attribue notes et commentaires, consulte les résultats.

### Étudiant
Consulte les évaluations auxquelles il est inscrit, les réalise, dépose
fichiers si requis, soumet son travail avant l'échéance, consulte son
résultat une fois publié.

### Administrateur
Gère les utilisateurs, les rôles, les matières, supervise la plateforme.

## 3. Fonctionnalités

Voir `README.md` (tableau des services) pour le détail F1-F10 et leur
service porteur. Résumé :

| # | Fonctionnalité | Service |
|---|---|---|
| F1 | Gestion des utilisateurs, auth, rôles | user-service |
| F2 | Banque de questions | question-service |
| F3 | Création d'une évaluation | assessment-service |
| F4 | Génération automatique d'une évaluation | assessment-service → question-service (gRPC) |
| F5 | Planification et publication | assessment-service |
| F6 | Réalisation d'une évaluation | submission-service |
| F7 | Dépôt de devoir | submission-service |
| F8 | Correction automatique | grading-service |
| F9 | Correction manuelle | grading-service |
| F10 | Gestion des résultats | assessment-service (Read Model) |

## 4. Règles métier

1. Une évaluation n'est accessible aux étudiants que pendant sa période
   planifiée (entre date de début et date de fin).
2. Une soumission reçue après la date de fin est **refusée
   automatiquement** ; l'étudiant est notifié de l'échec du dépôt.
3. Un étudiant ne peut soumettre qu'une seule fois par évaluation
   (sauf autorisation explicite de l'enseignant pour une resoumission).
4. Une évaluation ne peut être **publiée** que si elle contient au moins
   une question et un barème total supérieur à 0.
5. La correction automatique s'applique uniquement aux types QCM,
   Vrai/Faux et question courte à correspondance exacte ; les questions
   ouvertes et devoirs nécessitent une correction manuelle.
6. Un étudiant ne voit son résultat qu'après l'événement
   `ResultPublished` — jamais avant, même si la correction est terminée.
7. Seul l'enseignant responsable de l'évaluation (ou un enseignant
   habilité) peut modifier une note ; l'administrateur ne corrige pas.
8. Une question retirée de la banque active reste consultable dans les
   évaluations passées qui l'utilisaient déjà (pas de suppression en
   cascade).

## 5. Cas d'utilisation principaux

### UC1 — Créer une question (Enseignant)
1. L'enseignant se connecte et accède à la banque de questions.
2. Il saisit l'énoncé, le type, la matière, le chapitre, la difficulté,
   le nombre de points, la ou les réponses et la correction.
3. Le système enregistre la question et la rend disponible pour la
   sélection dans une évaluation.

### UC2 — Générer une évaluation automatiquement (Enseignant)
1. L'enseignant indique matière, nombre de questions, répartition de
   difficulté et thèmes souhaités.
2. `assessment-service` appelle `question-service` (gRPC
   `SelectQuestions`) avec ces critères.
3. Le système propose une liste de questions ; l'enseignant peut
   ajuster manuellement avant validation.

### UC3 — Planifier et publier une évaluation (Enseignant)
1. L'enseignant définit dates de début/fin, durée et consignes.
2. Il publie l'évaluation → passage à l'état PUBLIÉE, événement
   `AssessmentPublished` émis.
3. Les étudiants inscrits reçoivent une notification et voient
   l'évaluation apparaître dans leur liste.

### UC4 — Réaliser une évaluation (Étudiant)
1. L'étudiant ouvre une évaluation publiée et dans sa période active.
2. Il consulte les consignes, répond aux questions, enregistre au fur
   et à mesure.
3. Il soumet son travail avant l'échéance → horodatage,
   `SubmissionCompleted` émis.

### UC5 — Déposer un devoir (Étudiant)
1. L'étudiant dépose un fichier associé à une évaluation de type devoir.
2. Le système enregistre le fichier, la date de dépôt et le statut.
3. Refus automatique si la date limite est dépassée.

### UC6 — Corriger automatiquement (Système)
1. À réception de `SubmissionCompleted`, `grading-service` compare les
   réponses de l'étudiant aux réponses attendues pour les questions
   QCM/Vrai-Faux/réponse courte.
2. Le score partiel est calculé et enregistré.

### UC7 — Corriger manuellement (Enseignant)
1. L'enseignant consulte les copies contenant des questions ouvertes ou
   des devoirs.
2. Il attribue une note et un commentaire par question/devoir.
3. Il valide la correction → `GradingCompleted`, puis `ResultPublished`
   quand l'ensemble de la copie est corrigé.

### UC8 — Consulter les résultats (Étudiant / Enseignant)
1. L'étudiant consulte sa note, son score et les commentaires une fois
   publiés.
2. L'enseignant consulte les résultats de l'ensemble des étudiants, la
   moyenne, le nombre de soumissions et la répartition des notes.

### UC9 — Gérer les utilisateurs et rôles (Administrateur)
1. L'administrateur crée un utilisateur et lui attribue un rôle
   (Enseignant, Étudiant, Administrateur).
2. Il peut désactiver un compte ou modifier un rôle.

## 6. User stories

- En tant qu'**enseignant**, je veux constituer une banque de questions
  réutilisable, afin de ne pas recréer les questions à chaque évaluation.
- En tant qu'**enseignant**, je veux générer automatiquement une
  évaluation selon des critères de difficulté, afin de gagner du temps
  sur la sélection manuelle.
- En tant qu'**enseignant**, je veux planifier la publication d'une
  évaluation, afin qu'elle ne soit visible des étudiants qu'au bon moment.
- En tant qu'**étudiant**, je veux être notifié quand une évaluation est
  publiée, afin de ne pas manquer une échéance.
- En tant qu'**étudiant**, je veux enregistrer mes réponses au fur et à
  mesure, afin de ne pas perdre mon travail en cas de coupure.
- En tant qu'**étudiant**, je veux consulter mon résultat et les
  commentaires de l'enseignant, afin de comprendre mes erreurs.
- En tant qu'**enseignant**, je veux que les QCM soient corrigés
  automatiquement, afin de me concentrer sur les questions ouvertes.
- En tant qu'**administrateur**, je veux gérer les rôles des
  utilisateurs, afin de contrôler les accès à la plateforme.
