# grading-service

## Responsabilité
- Correction automatique (QCM, Vrai/Faux, réponses courtes)
- Correction manuelle (questions ouvertes, devoirs) : note, commentaire
- Calcul du score de chaque copie

Les statistiques par évaluation (moyenne, répartition des notes) sont
exposées par le Read Model d'`assessment-service`, alimenté par les
événements `GradingCompleted` et `ResultPublished`.

## Données possédées
- Grades (notes, commentaires, statut de correction)

## Communication
- REST (consultation/attribution des notes)
- Messaging : consomme `SubmissionCompleted`, publie `GradingCompleted` et `ResultPublished`
