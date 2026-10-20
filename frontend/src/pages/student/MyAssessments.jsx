import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import StateBlock from "../../components/ui/StateBlock";
import { listAssessments } from "../../api/assessments";
import { listSubmissions } from "../../api/submissions";
import { useAuth } from "../../auth/useAuth";
import { SUBMISSION_STATUS_LABELS, SUBMISSION_STATUS_TONES, formatDateTime } from "../../constants/assessment";

// État d'une évaluation du point de vue de l'étudiant : sa copie si elle
// existe, sinon la période d'ouverture.
function availability(assessment, submission, now) {
  if (submission) {
    return { label: SUBMISSION_STATUS_LABELS[submission.status], tone: SUBMISSION_STATUS_TONES[submission.status] };
  }
  if (assessment.dateDebut && now < new Date(assessment.dateDebut)) return { label: "Pas encore ouverte", tone: "neutral" };
  if (assessment.dateFin && now > new Date(assessment.dateFin)) return { label: "Fermée", tone: "neutral" };
  return { label: "À faire", tone: "warning" };
}

export default function MyAssessments() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([listAssessments(), listSubmissions()])
      .then(([assessments, submissions]) => setData({ assessments, submissions }))
      .catch((err) => setError(err.message));
  }, []);

  const now = new Date();

  return (
    <>
      <h1 className="text-[28px] font-extrabold tracking-tight">
        Bonjour <span className="text-ink-faint">{user.prenom}</span>
      </h1>

      {error && <StateBlock title="Impossible de charger vos évaluations" hint={error} />}

      <Card>
        <CardHeader title="Mes évaluations" subtitle="Évaluations publiées pour vous" />
        {!data && !error && <StateBlock title="Chargement…" />}
        {data && data.assessments.length === 0 && (
          <StateBlock title="Aucune évaluation publiée" hint="Vous serez notifié dès qu'une évaluation sera publiée." />
        )}
        {data && data.assessments.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Évaluation</th>
                <th>Ouverture</th>
                <th>Échéance</th>
                <th>État</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.assessments.map((a) => {
                const submission = data.submissions.find((s) => s.assessmentId === a._id);
                const state = availability(a, submission, now);
                return (
                  <tr key={a._id}>
                    <td>
                      <strong className="block font-semibold text-[13px]">{a.titre}</strong>
                      <span className="text-ink-muted text-xs">{a.matiere}</span>
                    </td>
                    <td>{formatDateTime(a.dateDebut)}</td>
                    <td>{formatDateTime(a.dateFin)}</td>
                    <td>
                      <Badge tone={state.tone}>{state.label}</Badge>
                    </td>
                    <td className="text-right">
                      <Link className="btn btn-secondary px-3.5 py-[7px] text-[13px]" to={`/mes-evaluations/${a._id}`}>
                        {submission?.status === "EN_COURS" ? "Continuer" : submission ? "Voir" : "Ouvrir"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
