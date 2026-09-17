# submission-service

## Responsabilité
- Consultation des évaluations ouvertes et des consignes
- Saisie et enregistrement des réponses de l'étudiant
- Dépôt de fichiers (devoirs)
- Soumission du travail avec horodatage
- Refus des soumissions hors délai

## Données possédées
- Submissions (réponses, fichiers déposés, date/heure de soumission, statut)

## Communication
- REST (dépôt, consultation du statut)
- Messaging : consomme `AssessmentPublished`, publie `SubmissionCompleted`
