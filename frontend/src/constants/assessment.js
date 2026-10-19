export const STATUS_LABELS = {
  BROUILLON: "Brouillon",
  PLANIFIEE: "Planifiée",
  PUBLIEE: "Publiée",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  CORRIGEE: "Corrigée",
  ANNULEE: "Annulée",
};

export const STATUS_TONES = {
  BROUILLON: "neutral",
  PLANIFIEE: "warning",
  PUBLIEE: "positive",
  EN_COURS: "positive",
  TERMINEE: "positive",
  CORRIGEE: "positive",
  ANNULEE: "danger",
};

export const PUBLISHED_STATUSES = ["PUBLIEE", "EN_COURS", "TERMINEE", "CORRIGEE"];

export const DIFFICULTY_LABELS = {
  FACILE: "Facile",
  MOYEN: "Moyen",
  DIFFICILE: "Difficile",
};

export const QUESTION_TYPE_LABELS = {
  QCM: "QCM",
  VRAI_FAUX: "Vrai / Faux",
  QUESTION_COURTE: "Question courte",
  QUESTION_OUVERTE: "Question ouverte",
};

export const SUBMISSION_STATUS_LABELS = {
  EN_COURS: "En cours",
  SOUMISE: "Soumise",
  REFUSEE_HORS_DELAI: "Refusée (hors délai)",
  ANNULEE: "Annulée",
};

export const SUBMISSION_STATUS_TONES = {
  EN_COURS: "warning",
  SOUMISE: "positive",
  REFUSEE_HORS_DELAI: "danger",
  ANNULEE: "neutral",
};

export function formatDateTime(value) {
  return value ? new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
}
