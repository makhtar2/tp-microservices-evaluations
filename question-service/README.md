# question-service

## Responsabilité
- Constitution de la banque de questions (créer, modifier, supprimer, consulter)
- Recherche et filtrage des questions
- Association d'une correction à chaque question
- Sélection de questions selon des critères (matière, difficulté, thème)
  pour la génération automatique d'une évaluation

## Données possédées
- Questions (énoncé, type, matière, chapitre, difficulté, points, réponses, correction)

## Communication
- REST (CRUD banque de questions)
- gRPC : `SelectQuestions(matiere, difficulte, nombre)` appelé par assessment-service
