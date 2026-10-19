import { useEffect, useState } from "react";
import { Card, CardHeader } from "../../components/ui/Card";
import StateBlock from "../../components/ui/StateBlock";
import { listAssessments, getResults } from "../../api/assessments";
import { useAuth } from "../../auth/useAuth";

// Résultats publiés de l'étudiant (UC8) : assessment-service ne lui renvoie
// que son propre résultat, avec la moyenne de la classe.
export default function MyResults() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    listAssessments({ status: "CORRIGEE" })
      .then((assessments) =>
        Promise.all(assessments.map(async (a) => ({ assessment: a, results: await getResults(a._id) })))
      )
      .then((all) =>
        setRows(
          all
            .map(({ assessment, results }) => ({
              assessment,
              moyenne: results.moyenne,
              mine: results.resultatsEtudiants.find((r) => r.etudiantId === user.id),
            }))
            .filter((row) => row.mine)
        )
      )
      .catch((err) => setError(err.message));
  }, [user.id]);

  return (
    <>
      <h1 className="text-[28px] font-extrabold tracking-tight">
        Mes <span className="text-ink-faint">résultats</span>
      </h1>

      {error && <StateBlock title="Impossible de charger vos résultats" hint={error} />}

      <Card>
        <CardHeader title="Résultats publiés" />
        {!rows && !error && <StateBlock title="Chargement…" />}
        {rows && rows.length === 0 && (
          <StateBlock title="Aucun résultat publié" hint="Vos notes apparaissent ici dès que l'enseignant les publie." />
        )}
        {rows && rows.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Évaluation</th>
                <th>Ma note</th>
                <th>Moyenne de la classe</th>
                <th>Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ assessment, moyenne, mine }) => (
                <tr key={assessment._id}>
                  <td>
                    <strong className="block font-semibold text-[13px]">{assessment.titre}</strong>
                    <span className="text-ink-muted text-xs">{assessment.matiere}</span>
                  </td>
                  <td>
                    <strong>{mine.note}</strong> / {assessment.bareme}
                  </td>
                  <td>{moyenne.toFixed(2)}</td>
                  <td>{mine.commentaire ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
