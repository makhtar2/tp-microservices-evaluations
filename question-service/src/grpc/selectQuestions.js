const Question = require('../models/Question');

/**
 * Calcule le nombre de questions à tirer par niveau de difficulté,
 * à partir de pourcentages (F4 : ex. 30% facile / 50% moyen / 20% difficile).
 */
function computeTargets(count, difficulty = {}) {
  const easy = Math.round((count * (difficulty.easyPercent || 0)) / 100);
  const medium = Math.round((count * (difficulty.mediumPercent || 0)) / 100);
  // Le reste absorbe les écarts d'arrondi pour totaliser exactement `count`.
  const hard = Math.max(count - easy - medium, 0);
  return { FACILE: easy, MOYEN: medium, DIFFICILE: hard };
}

/**
 * Sélectionne des questions dans la banque selon matière, thèmes et
 * répartition de difficulté demandée. Retourne aussi `fullySatisfied`
 * pour signaler à assessment-service si la banque était insuffisante.
 */
async function selectQuestions({ subject, count, difficulty, themes }) {
  const baseFilter = { subject, active: true };
  if (themes && themes.length > 0) {
    baseFilter.chapter = { $in: themes };
  }

  const targets = computeTargets(count, difficulty);
  let fullySatisfied = true;
  const selected = [];

  for (const [level, target] of Object.entries(targets)) {
    if (target <= 0) continue;
    const docs = await Question.aggregate([
      { $match: { ...baseFilter, difficulty: level } },
      { $sample: { size: target } },
    ]);
    if (docs.length < target) fullySatisfied = false;
    selected.push(...docs);
  }

  // Si le total n'atteint toujours pas `count` (banque trop pauvre sur
  // certains niveaux), on complète avec d'autres questions du même
  // sujet/thèmes, sans doublon, plutôt que de renvoyer moins que demandé.
  if (selected.length < count) {
    fullySatisfied = false;
    const excludeIds = selected.map((q) => q._id);
    const extra = await Question.aggregate([
      { $match: { ...baseFilter, _id: { $nin: excludeIds } } },
      { $sample: { size: count - selected.length } },
    ]);
    selected.push(...extra);
  }

  return { questions: selected, fullySatisfied };
}

module.exports = { selectQuestions, computeTargets };
