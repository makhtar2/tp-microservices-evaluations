# grading-service

## Responsabilité
- Correction automatique (QCM, Vrai/Faux, réponses courtes)
- Correction manuelle (questions ouvertes, devoirs) : note, commentaire
- Calcul du score et de la moyenne

## Données possédées
- Grades (notes, commentaires, statut de correction)

## Communication
- REST (consultation/attribution des notes)
- Messaging : consomme `SubmissionCompleted`, publie `GradingCompleted`
