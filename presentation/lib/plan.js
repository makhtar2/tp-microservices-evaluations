// Déroulé de la soutenance : une partie par présentateur, fondée sur ce
// que chacun a réalisé (voir CONTRIBUTING.md et l'historique Git).
// Repris par le sommaire, la slide équipe et presentation/README.md.

const PARTS = [
  { n: 1, titre: "Contexte & besoins", speaker: "fatou", minutes: 3, sujets: ["Problème et objectifs", "Acteurs et fonctionnalités", "Règles métier"] },
  { n: 2, titre: "Conception DDD & domaine Questions", speaker: "wade", minutes: 4, sujets: ["Sous-domaines et Bounded Contexts", "Context Map", "question-service et gRPC", "Frontend React"] },
  { n: 3, titre: "Architecture distribuée", speaker: "fallou", minutes: 5, sujets: ["Vue d'ensemble", "REST, gRPC et AMQP", "API Gateway et JWT", "Bus d'événements RabbitMQ", "Soumission et correction"] },
  { n: 4, titre: "CQRS & Event Sourcing", speaker: "mbacke", minutes: 4, sujets: ["Séparation écriture / lecture", "Event Store et reconstruction", "Le Read Model en action"] },
  { n: 5, titre: "Saga, fiabilité & tests", speaker: "bara", minutes: 4, sujets: ["Saga chorégraphiée", "Compensation et dead-letters", "Sécurité et resoumission", "Tests unitaires et bout-en-bout"] },
  { n: 6, titre: "Déploiement & démonstration", speaker: "aidara", minutes: 4, sujets: ["Conteneurisation Docker", "Documentation et contrats", "Démonstration de l'interface"] },
];

// Conclusion (principes démontrés, bilan, perspectives), avant les questions.
const CONCLUSION = { titre: "Conclusion", speaker: "fatou", minutes: 2 };

// Réalisations de chaque membre, telles qu'elles apparaissent dans le dépôt.
const REALISATIONS = {
  fatou: ["Présente le contexte, les besoins et le bilan du projet"],
  wade: [
    "Structure du dépôt, analyse DDD et cahier de conception",
    "CRUD question-service et assessment-service",
    "gRPC SelectQuestions, contrats OpenAPI",
    "Scaffold du frontend React (Vite, Tailwind)",
  ],
  mbacke: [
    "question-service persisté dans MongoDB",
    "CQRS et Event Sourcing sur assessment-service",
    "Publication de AssessmentPublished",
    "Reconstruction d'état et Read Model des résultats",
  ],
  fallou: [
    "user-service : authentification JWT et rôles",
    "api-gateway : routage et identité propagée",
    "submission-service et grading-service",
    "notification-service et mise en place de RabbitMQ",
  ],
  bara: [
    "Compensation de la Saga et files dead-letters",
    "Resoumission, planification, durcissement sécurité",
    "Frontend complet (étudiant, correction, admin)",
    "234 tests unitaires et 40 tests bout-en-bout",
  ],
  aidara: [
    "docker-compose : 15 conteneurs orchestrés",
    "Dockerfiles (assessment, frontend), .dockerignore",
    "Documentation des 7 services et README racine",
    "Suite de validation docs et Docker (110 vérifications)",
  ],
};

module.exports = { PARTS, CONCLUSION, REALISATIONS };
