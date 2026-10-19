import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Card, CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StateBlock from "../components/ui/StateBlock";
import { listQuestions, createQuestion, deleteQuestion } from "../api/questions";
import { DIFFICULTY_LABELS, QUESTION_TYPE_LABELS } from "../constants/assessment";

const EMPTY_FORM = {
  statement: "",
  type: "QCM",
  subject: "",
  chapter: "",
  difficulty: "FACILE",
  points: 1,
  options: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ],
  vrai: true,
  acceptedAnswers: "",
  correction: "",
};

// Construit `answers` au format attendu par question-service et par la
// correction automatique (voir question-service/src/models/Question.js).
function toPayload(form) {
  const { options, vrai, acceptedAnswers, correction, ...question } = form;
  const payload = { ...question, points: Number(form.points), correction: correction || undefined };
  if (form.type === "QCM") {
    payload.answers = options.filter((o) => o.text.trim()).map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect }));
  } else if (form.type === "VRAI_FAUX") {
    payload.answers = { correctAnswer: vrai };
  } else if (form.type === "QUESTION_COURTE") {
    payload.answers = { acceptedAnswers: acceptedAnswers.split(";").map((a) => a.trim()).filter(Boolean) };
  }
  return payload;
}

function validate(form) {
  if (form.type === "QCM") {
    const filled = form.options.filter((o) => o.text.trim());
    if (filled.length < 2) return "Un QCM doit avoir au moins deux options.";
    if (!filled.some((o) => o.isCorrect)) return "Cochez au moins une bonne réponse.";
  }
  if (form.type === "QUESTION_COURTE" && !form.acceptedAnswers.trim()) {
    return "Indiquez au moins une réponse acceptée.";
  }
  return null;
}

// Saisie de la ou des bonnes réponses selon le type de question.
function AnswersEditor({ form, setForm }) {
  if (form.type === "QCM") {
    const update = (index, changes) =>
      setForm({ ...form, options: form.options.map((o, i) => (i === index ? { ...o, ...changes } : o)) });
    return (
      <div className="flex flex-col gap-1.5">
        <span className="field-label">Options (cochez la ou les bonnes réponses)</span>
        {form.options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label={`Option ${index + 1} correcte`}
              checked={option.isCorrect}
              onChange={(e) => update(index, { isCorrect: e.target.checked })}
            />
            <input
              className="field-input"
              placeholder={`Option ${index + 1}`}
              value={option.text}
              onChange={(e) => update(index, { text: e.target.value })}
            />
            {form.options.length > 2 && (
              <button
                type="button"
                className="icon-action"
                aria-label="Retirer l'option"
                onClick={() => setForm({ ...form, options: form.options.filter((_, i) => i !== index) })}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="text-xs font-semibold text-ink-muted hover:text-primary text-left"
          onClick={() => setForm({ ...form, options: [...form.options, { text: "", isCorrect: false }] })}
        >
          + Ajouter une option
        </button>
      </div>
    );
  }

  if (form.type === "VRAI_FAUX") {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="field-label">Bonne réponse</span>
        <div className="segmented">
          {[
            [true, "Vrai"],
            [false, "Faux"],
          ].map(([value, label]) => (
            <button
              key={label}
              type="button"
              className={`segmented-btn${form.vrai === value ? " segmented-btn-active" : ""}`}
              onClick={() => setForm({ ...form, vrai: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (form.type === "QUESTION_COURTE") {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="field-label" htmlFor="accepted">
          Réponses acceptées (séparées par ;)
        </label>
        <input
          id="accepted"
          className="field-input"
          placeholder="RabbitMQ; Kafka"
          value={form.acceptedAnswers}
          onChange={(e) => setForm({ ...form, acceptedAnswers: e.target.value })}
        />
        <span className="text-xs text-ink-muted">La casse, les accents et les espaces autour sont ignorés.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="field-label" htmlFor="correction">
        Guide de correction (facultatif)
      </label>
      <textarea
        id="correction"
        className="field-textarea"
        value={form.correction}
        onChange={(e) => setForm({ ...form, correction: e.target.value })}
      />
    </div>
  );
}

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
    const invalid = validate(form);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createQuestion(toPayload(form));
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-[28px] font-extrabold tracking-tight">
          Banque de <span className="text-ink-faint">questions</span>
        </h1>
      </div>

      {error && <StateBlock title="Erreur" hint={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 items-start">
        <Card>
          <CardHeader title="Nouvelle question" />
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="field-label">Énoncé</label>
              <textarea
                className="field-textarea"
                required
                value={form.statement}
                onChange={(e) => setForm({ ...form, statement: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="field-label">Matière</label>
                <input
                  className="field-input"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="field-label">Chapitre</label>
                <input
                  className="field-input"
                  required
                  value={form.chapter}
                  onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="field-label">Type</label>
                <select className="field-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="field-label">Difficulté</label>
                <select
                  className="field-input"
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
              <div className="flex flex-col gap-1.5">
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

            <AnswersEditor form={form} setForm={setForm} />

            <Button type="submit" disabled={submitting}>
              <Plus size={16} />
              {submitting ? "Création…" : "Créer la question"}
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader
            title="Questions"
            subtitle={questions ? `${questions.total} question${questions.total > 1 ? "s" : ""}` : ""}
            action={
              <div className="flex gap-2">
                <input
                  className="field-input min-w-[140px]"
                  placeholder="Filtrer par matière"
                  value={filters.subject}
                  onChange={(e) => handleFilterChange("subject", e.target.value)}
                />
                <select
                  className="field-input min-w-[140px]"
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
                    <td>
                      <strong className="block font-semibold text-[13px]">
                        {q.statement.length > 60 ? `${q.statement.slice(0, 60)}…` : q.statement}
                      </strong>
                      <span className="text-ink-muted text-xs">{q.chapter}</span>
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
