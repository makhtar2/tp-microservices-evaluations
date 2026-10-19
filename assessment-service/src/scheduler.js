const AssessmentReadModel = require("./models/AssessmentReadModel");
const commands = require("./commands");
const projectionUpdater = require("./projectionUpdater");
const publisher = require("./messaging/publisher");

// Tâches planifiées d'assessment-service, exécutées à intervalle régulier :
// 1. publication automatique des évaluations PLANIFIEE dont la
//    datePublication est atteinte (même chemin qu'une publication manuelle,
//    donc AssessmentPublished est bien émis) ;
// 2. émission d'AssessmentClosingSoon une seule fois par évaluation publiée,
//    quand sa date de fin approche (rappel aux étudiants).
const INTERVAL_MS = Number(process.env.SCHEDULER_INTERVAL_MS) || 60 * 1000;
const CLOSING_SOON_MS = (Number(process.env.CLOSING_SOON_HOURS) || 24) * 60 * 60 * 1000;

async function publishDueAssessments(now) {
  const due = await AssessmentReadModel.find({ status: "PLANIFIEE", datePublication: { $lte: now } }).lean();
  const published = [];
  for (const assessment of due) {
    try {
      await commands.publishAssessment(assessment._id);
      published.push(assessment._id);
    } catch (err) {
      console.error(`[assessment-service] Publication planifiée de ${assessment._id} impossible :`, err.message);
    }
  }
  return published;
}

async function notifyClosingSoon(now) {
  const closing = await AssessmentReadModel.find({
    status: "PUBLIEE",
    dateFin: { $gt: now, $lte: new Date(now.getTime() + CLOSING_SOON_MS) },
    closingSoonNotifiedAt: null,
  }).lean();
  const notified = [];
  for (const assessment of closing) {
    // L'événement est d'abord enregistré : si le service redémarre, le
    // rappel n'est pas émis une seconde fois.
    await projectionUpdater.recordEvent(assessment._id, "AssessmentClosingSoonNotified", {
      notifiedAt: now.toISOString(),
    });
    await publisher.publishAssessmentClosingSoon(assessment);
    notified.push(assessment._id);
  }
  return notified;
}

async function runScheduledTasks(now = new Date()) {
  const published = await publishDueAssessments(now);
  const closingSoon = await notifyClosingSoon(now);
  return { published, closingSoon };
}

function startScheduler() {
  const tick = () =>
    runScheduledTasks().catch((err) => console.error("[assessment-service] Tâches planifiées en échec :", err.message));
  tick();
  return setInterval(tick, INTERVAL_MS);
}

module.exports = { runScheduledTasks, startScheduler, CLOSING_SOON_MS };
