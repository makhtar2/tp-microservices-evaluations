import { useEffect, useMemo, useState } from "react";
import { BookOpen, ClipboardList } from "lucide-react";
import { Card, CardHeader } from "../components/ui/Card";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import StateBlock from "../components/ui/StateBlock";
import { listQuestions } from "../api/questions";
import { listAssessments } from "../api/assessments";
import { STATUS_LABELS, STATUS_TONES, PUBLISHED_STATUSES } from "../constants/assessment";

export default function Dashboard() {
  const [questions, setQuestions] = useState(null);
  const [assessments, setAssessments] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([listQuestions({ limit: 100 }), listAssessments()])
      .then(([questionsRes, assessmentsRes]) => {
        setQuestions(questionsRes);
        setAssessments(assessmentsRes);
      })
      .catch((err) => setError(err.message));
  }, []);

  const stats = useMemo(() => {
    const total = assessments?.length ?? 0;
    const published = assessments?.filter((a) => PUBLISHED_STATUSES.includes(a.status)).length ?? 0;
    return { total, published };
  }, [assessments]);

  const recentAssessments = useMemo(() => {
    return [...(assessments ?? [])]
      .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))
      .slice(0, 5);
  }, [assessments]);

  const loading = questions === null && assessments === null && !error;

  return (
    <>
      <h1 className="text-[28px] font-extrabold tracking-tight">
        Bonjour <span className="text-ink-faint">Enseignant</span>
      </h1>

      {error && <StateBlock title="Impossible de charger les données" hint={error} />}
      {loading && <StateBlock title="Chargement…" />}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <StatCard dark label="Questions dans la banque" value={questions?.total ?? 0} icon={<BookOpen size={15} />} />
            <StatCard
              label="Évaluations créées"
              value={stats.total}
              sub={`dont ${stats.published} publiée${stats.published > 1 ? "s" : ""}`}
              icon={<ClipboardList size={15} />}
            />
          </div>

          <Card>
            <CardHeader title="Vos dernières évaluations" />
            {recentAssessments.length === 0 ? (
              <StateBlock title="Aucune évaluation créée" hint="Rendez-vous sur la page Évaluations pour en créer une." />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Matière</th>
                    <th>Statut</th>
                    <th>Questions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAssessments.map((a) => (
                    <tr key={a._id}>
                      <td>
                        <strong className="block font-semibold text-[13px]">{a.titre}</strong>
                        <span className="text-ink-muted text-xs">
                          {a.createdAt ? new Date(a.createdAt).toLocaleDateString("fr-FR") : "—"}
                        </span>
                      </td>
                      <td>{a.matiere}</td>
                      <td>
                        <Badge tone={STATUS_TONES[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                      </td>
                      <td>{a.questionIds?.length ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </>
  );
}
