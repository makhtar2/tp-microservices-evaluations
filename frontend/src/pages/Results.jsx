import { useEffect, useState } from "react";
import { Card, CardHeader } from "../components/ui/Card";
import StateBlock from "../components/ui/StateBlock";
import StatCard from "../components/ui/StatCard";
import { listAssessments, getResults } from "../api/assessments";

export default function Results() {
  const [assessments, setAssessments] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    listAssessments().then(setAssessments).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setResults(null);
      return;
    }
    getResults(selectedId).then(setResults).catch((err) => setError(err.message));
  }, [selectedId]);

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-[28px] font-extrabold tracking-tight">
          Consultation des <span className="text-ink-faint">résultats</span>
        </h1>
      </div>

      {error && <StateBlock title="Erreur" hint={error} />}

      <Card>
        <CardHeader
          title="Choisir une évaluation"
          action={
            <select className="field-input min-w-[220px]" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {(assessments ?? []).map((a) => (
                <option key={a._id} value={a._id}>
                  {a.titre} ({a.status})
                </option>
              ))}
            </select>
          }
        />

        {!selectedId && (
          <StateBlock
            title="Sélectionnez une évaluation"
            hint="Les résultats individuels n'apparaissent qu'après publication (result.published)."
          />
        )}

        {selectedId && results === null && <StateBlock title="Chargement…" />}

        {results && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <StatCard dark label="Moyenne" value={results.moyenne?.toFixed(2) ?? 0} sub="sur le barème de l'évaluation" />
              <StatCard label="Résultats publiés" value={results.nombreSoumissions ?? 0} sub="étudiants" />
            </div>

            {results.resultatsEtudiants.length === 0 ? (
              <StateBlock
                title="Aucun résultat publié pour le moment"
                hint="En attente de grading-service (correction) et de result.published."
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Étudiant</th>
                    <th>Note</th>
                    <th>Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {results.resultatsEtudiants.map((r) => (
                    <tr key={r.etudiantId}>
                      <td>{r.etudiantId}</td>
                      <td>{r.note}</td>
                      <td>{r.commentaire ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </Card>
    </>
  );
}
