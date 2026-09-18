# assessment-service

## Responsabilité
- Création d'une évaluation à partir de la banque de questions
- Sélection manuelle ou génération automatique des questions
- Planification (dates de début/fin, durée, barème)
- Publication ou annulation
- Gestion des états : BROUILLON, PLANIFIÉE, PUBLIÉE, EN_COURS, TERMINÉE, CORRIGÉE

## Données possédées
- Evaluations (Write Model + Read Model, voir CQRS)

## Communication
- REST (CRUD évaluations, lecture des résultats)
- gRPC (appel sortant vers question-service pour la génération automatique)
- Messaging : publie `AssessmentPublished` et `AssessmentClosingSoon` ;
  consomme `GradingCompleted` et `ResultPublished` pour alimenter le Read Model des résultats
