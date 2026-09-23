// Reconstruction d'état : réduit une séquence d'événements de l'Event
// Store en un état courant. Utilisée à la fois pour (re)matérialiser le
// Read Model après chaque nouvel événement, et pour un rebuild complet
// (rejouer tout l'historique d'une évaluation à partir de zéro).

function applyEvent(state, event) {
  const { type, payload } = event;

  switch (type) {
    case "AssessmentCreated":
      return {
        _id: event.assessmentId,
        titre: payload.titre,
        enseignantId: payload.enseignantId,
        matiere: payload.matiere,
        questionIds: payload.questionIds || [],
        bareme: payload.bareme || 0,
        dateDebut: payload.dateDebut,
        dateFin: payload.dateFin,
        duree: payload.duree,
        consignes: payload.consignes,
        status: "BROUILLON",
        resultatsEtudiants: [],
      };

    case "AssessmentUpdated":
      return { ...state, ...payload };

    case "AssessmentPublished":
      return { ...state, status: "PUBLIEE" };

    case "AssessmentCancelled":
      return { ...state, status: "ANNULEE" };

    case "GradingCompleted":
      // Correction terminée pour un étudiant : pas de changement visible
      // sur le Read Model tant que ResultPublished n'est pas reçu (règle
      // métier : un résultat n'est visible qu'après publication explicite).
      return state;

    case "ResultPublished": {
      const resultatsEtudiants = [...(state.resultatsEtudiants || [])];
      const index = resultatsEtudiants.findIndex((r) => r.etudiantId === payload.etudiantId);
      const resultat = {
        etudiantId: payload.etudiantId,
        note: payload.note,
        commentaire: payload.commentaire,
        resultPublished: true,
      };
      if (index >= 0) {
        resultatsEtudiants[index] = resultat;
      } else {
        resultatsEtudiants.push(resultat);
      }
      return { ...state, resultatsEtudiants, status: "CORRIGEE" };
    }

    default:
      return state;
  }
}

function reconstructState(events) {
  return events.reduce(applyEvent, null);
}

module.exports = { applyEvent, reconstructState };
