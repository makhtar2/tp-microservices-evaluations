// Charte graphique du support, alignée sur l'interface Evalio (vert profond).

const COLORS = {
  ink: "0F1F1A",
  text: "334155",
  muted: "64748B",
  line: "D7DDD9",
  bg: "F6F7F5",
  white: "FFFFFF",
  deep: "12372F",
  deep2: "1B4A3F",
  mint: "34D399",
  mintSoft: "D1FAE5",
  group1: "0284C7",
  group2: "D97706",
  rabbit: "F97316",
  mongo: "16A34A",
  danger: "DC2626",
  dangerSoft: "FEE2E2",
  warnSoft: "FEF3C7",
  infoSoft: "E0F2FE",
};

const FONTS = {
  body: "Segoe UI",
  title: "Segoe UI Semibold",
  code: "Consolas",
};

const PROJECT = {
  titre: "Plateforme distribuée de gestion des évaluations",
  sousTitre: "Architecture microservices · Événements · Saga · CQRS",
  universite: "Université Cheikh Ahmadoul Khadim (UCAK)",
  classe: "Licence 3 — Développement d'Applications Réparties",
  annee: "Année universitaire 2025-2026",
  footer: "UCAK · L3 Développement d'Applications Réparties",
};

// Une couleur par présentateur, reprise sur ses slides (bandeau « Présenté par »).
const SPEAKERS = {
  fatou: { nom: "Fatou Ngom", groupe: "Transverse", color: "9333EA" },
  wade: { nom: "Makhtar Wade", groupe: "Groupe 1", color: "0284C7" },
  mbacke: { nom: "Mouhamed Mbacke", groupe: "Groupe 1", color: "0D9488" },
  fallou: { nom: "El Hadji Fallou Bousso", groupe: "Groupe 2", color: "D97706" },
  bara: { nom: "Mame Bara Samb", groupe: "Groupe 2", color: "DB2777" },
  aidara: { nom: "Pape Makhtar Aidara", groupe: "Groupe 2", color: "4F46E5" },
  tous: { nom: "Toute l'équipe", groupe: "", color: "12372F" },
};

module.exports = { COLORS, FONTS, PROJECT, SPEAKERS };
