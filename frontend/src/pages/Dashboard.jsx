import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from "recharts";
import { BookOpen, ClipboardList, Target } from "lucide-react";
import { Card, CardHeader } from "../components/ui/Card";
import StatCard from "../components/ui/StatCard";
import Badge from "../components/ui/Badge";
import StateBlock from "../components/ui/StateBlock";
import { listQuestions } from "../api/questions";
import { listAssessments } from "../api/assessments";
import { STATUS_LABELS, STATUS_TONES, PUBLISHED_STATUSES } from "../constants/assessment";
import "./Dashboard.css";

export default function Dashboard() {
  const [questions, setQuestions] = useState(null);
  const [assessments, setAssessments] = useState(null);
  const [error, setError] = useState(null);
  const [chartFilter, setChartFilter] = useState("toutes");

  useEffect(() => {
    Promise.all([listQuestions({ limit: 100 }), listAssessments()])
      .then(([questionsRes, assessmentsRes]) => {
        setQuestions(questionsRes);
        setAssessments(assessmentsRes);
      })
      .catch((err) => setError(err.message));
  }, []);

  const stats = useMemo(() => {
    const items = questions?.items ?? [];
    const subjectsCount = new Set(items.map((q) => q.subject)).size;
    const total = assessments?.length ?? 0;
    const published = assessments?.filter((a) => PUBLISHED_STATUSES.includes(a.status)).length ?? 0;
    const baremes = (assessments ?? []).map((a) => a.bareme).filter((b) => typeof b === "number");
    const avgBareme = baremes.length ? Math.round((baremes.reduce((a, b) => a + b, 0) / baremes.length) * 10) / 10 : 0;
    return { subjectsCount, total, published, avgBareme };
  }, [questions, assessments]);

  const chartData = useMemo(() => {
    const source = assessments ?? [];
    const filtered = chartFilter === "publiees" ? source.filter((a) => PUBLISHED_STATUSES.includes(a.status)) : source;
    return filtered.slice(0, 8).map((a) => ({
      name: a.titre?.length > 14 ? `${a.titre.slice(0, 14)}…` : a.titre,
      bareme: a.bareme ?? 0,
    }));
  }, [assessments, chartFilter]);

  const recentAssessments = useMemo(() => {
    return [...(assessments ?? [])]
      .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))
      .slice(0, 5);
  }, [assessments]);

  const loading = questions === null && assessments === null && !error;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          Tableau de bord <span>Enseignant</span>
        </h1>
      </div>

      {error && <StateBlock title="Impossible de charger les données" hint={error} />}
      {loading && <StateBlock title="Chargement…" />}

      {!loading && !error && (
        <div className="dashboard-grid">
          <div className="dashboard-col">
            <StatCard
              dark
              label="Banque de questions"
              value={questions?.total ?? 0}
              sub={`${stats.subjectsCount} matière${stats.subjectsCount > 1 ? "s" : ""}`}
              icon={<BookOpen size={15} />}
            />
            <StatCard
              label="Évaluations"
              value={stats.total}
              sub={`${stats.published} publiée${stats.published > 1 ? "s" : ""} sur ${stats.total}`}
              icon={<ClipboardList size={15} />}
            />
          </div>

          <Card>
            <CardHeader
              title="Barème par évaluation"
              subtitle="Dernières évaluations créées"
              action={
                <div className="chart-toggle">
                  <button className={chartFilter === "toutes" ? "active" : ""} onClick={() => setChartFilter("toutes")}>
                    Toutes
                  </button>
                  <button className={chartFilter === "publiees" ? "active" : ""} onClick={() => setChartFilter("publiees")}>
                    Publiées
                  </button>
                </div>
              }
            />
            {chartData.length === 0 ? (
              <StateBlock title="Aucune évaluation" hint="Créez une évaluation pour voir le graphique." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--color-shell)" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 12 }}
                  />
                  <Bar dataKey="bareme" radius={[8, 8, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={index === 0 ? "#163832" : "#8fd0ab"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="dashboard-col">
            <StatCard label="Barème moyen" value={stats.avgBareme} sub="par évaluation" icon={<Target size={15} />} />
            <Card>
              <CardHeader title="Dernières évaluations" />
              {recentAssessments.length === 0 ? (
                <StateBlock title="Rien pour l'instant" />
              ) : (
                <div className="mini-list">
                  {recentAssessments.slice(0, 3).map((a) => (
                    <div className="mini-list-item" key={a._id}>
                      <div>
                        <strong>{a.titre}</strong>
                        <div className="muted">{a.matiere}</div>
                      </div>
                      <Badge tone={STATUS_TONES[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {!loading && !error && (
        <Card>
          <CardHeader title="Historique des évaluations" subtitle="Les 5 plus récentes" />
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
                  <th>Barème</th>
                </tr>
              </thead>
              <tbody>
                {recentAssessments.map((a) => (
                  <tr key={a._id}>
                    <td className="table-title-cell">
                      <strong>{a.titre}</strong>
                      <span>{a.createdAt ? new Date(a.createdAt).toLocaleDateString("fr-FR") : "—"}</span>
                    </td>
                    <td>{a.matiere}</td>
                    <td>
                      <Badge tone={STATUS_TONES[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                    </td>
                    <td>{a.questionIds?.length ?? 0}</td>
                    <td>{a.bareme ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </>
  );
}
