import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StateBlock from "../components/ui/StateBlock";
import { listQuestions, createQuestion, deleteQuestion } from "../api/questions";
import { DIFFICULTY_LABELS, QUESTION_TYPE_LABELS } from "../constants/assessment";
import "./Dashboard.css";
import "./Questions.css";

const EMPTY_FORM = {
  statement: "",
  type: "QCM",
  subject: "",
  chapter: "",
  difficulty: "FACILE",
  points: 1,
};

export default function Questions() {
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ subject: "", difficulty: "", type: "" });

  function load(activeFilters = filters) {
    listQuestions({ ...activeFilters, limit: 50 })
      .then(setQuestions)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilterChange(key, value) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    load(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createQuestion({ ...form, points: Number(form.points) });
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteQuestion(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          Banque de <span>questions</span>
        </h1>
      </div>

      {error && <StateBlock title="Erreur" hint={error} />}

      <div className="questions-layout">
        <Card className="questions-form-card">
          <CardHeader title="Nouvelle question" />
          <form className="question-form" onSubmit={handleSubmit}>
            <div className="field">
              <label className="field-label">Énoncé</label>
              <textarea
                className="field-textarea"
                required
                value={form.statement}
                onChange={(e) => setForm({ ...form, statement: e.target.value })}
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label">Matière</label>
                <input
                  className="field-input"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-label">Chapitre</label>
                <input
                  className="field-input"
                  required
                  value={form.chapter}
                  onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label">Type</label>
                <select className="field-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Difficulté</label>
                <select
                  className="field-select"
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                >
                  {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Points</label>
                <input
                  className="field-input"
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={form.points}
                  onChange={(e) => setForm({ ...form, points: e.target.value })}
                />
              </div>
            </div>

            <Button type="submit" disabled={submitting}>
              <Plus size={16} />
              {submitting ? "Création…" : "Créer la question"}
            </Button>
          </form>
        </Card>

        <Card className="questions-list-card">
          <CardHeader
            title="Questions"
            subtitle={questions ? `${questions.total} question${questions.total > 1 ? "s" : ""}` : ""}
            action={
              <div className="questions-filters">
                <input
                  className="field-input"
                  placeholder="Filtrer par matière"
                  value={filters.subject}
                  onChange={(e) => handleFilterChange("subject", e.target.value)}
                />
                <select
                  className="field-select"
                  value={filters.difficulty}
                  onChange={(e) => handleFilterChange("difficulty", e.target.value)}
                >
                  <option value="">Toutes difficultés</option>
                  {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            }
          />

          {questions === null && <StateBlock title="Chargement…" />}
          {questions && questions.items.length === 0 && (
            <StateBlock title="Aucune question" hint="Créez votre première question avec le formulaire ci-contre." />
          )}
          {questions && questions.items.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Énoncé</th>
                  <th>Matière</th>
                  <th>Type</th>
                  <th>Difficulté</th>
                  <th>Points</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {questions.items.map((q) => (
                  <tr key={q._id}>
                    <td className="table-title-cell">
                      <strong>{q.statement.length > 60 ? `${q.statement.slice(0, 60)}…` : q.statement}</strong>
                      <span>{q.chapter}</span>
                    </td>
                    <td>{q.subject}</td>
                    <td>{QUESTION_TYPE_LABELS[q.type] ?? q.type}</td>
                    <td>
                      <Badge tone={q.difficulty === "DIFFICILE" ? "danger" : q.difficulty === "MOYEN" ? "warning" : "positive"}>
                        {DIFFICULTY_LABELS[q.difficulty] ?? q.difficulty}
                      </Badge>
                    </td>
                    <td>{q.points}</td>
                    <td>
                      <button className="icon-action" onClick={() => handleDelete(q._id)} aria-label="Retirer la question">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
