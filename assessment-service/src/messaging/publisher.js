const { getChannel, EXCHANGE } = require("./connection");

async function publish(routingKey, payload) {
  try {
    const channel = await getChannel();
    channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
      contentType: "application/json",
      persistent: true,
    });
  } catch (err) {
    console.error(`[assessment-service] Publication de "${routingKey}" impossible (broker indisponible) :`, err.message);
  }
}

function publishAssessmentPublished(assessment) {
  return publish("assessment.published", {
    assessmentId: assessment._id,
    titre: assessment.titre,
    matiere: assessment.matiere,
    dateDebut: assessment.dateDebut,
    dateFin: assessment.dateFin,
    occurredAt: new Date().toISOString(),
  });
}

function publishAssessmentClosingSoon(assessment) {
  return publish("assessment.closing_soon", {
    assessmentId: assessment._id,
    titre: assessment.titre,
    dateFin: assessment.dateFin,
    occurredAt: new Date().toISOString(),
  });
}

module.exports = { publish, publishAssessmentPublished, publishAssessmentClosingSoon };
