import { useEffect, useState } from "react";
import { Plus, Send, Ban, ChevronDown, CalendarClock } from "lucide-react";
import { Card, CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StateBlock from "../components/ui/StateBlock";
import {
  listAssessments,
  createAssessment,
  publishAssessment,
  scheduleAssessment,
  cancelAssessment,
} from "../api/assessments";
import { listQuestions } from "../api/questions";
import { STATUS_LABELS, STATUS_TONES, DIFFICULTY_LABELS, QUESTION_TYPE_LABELS, formatDateTime } from "../constants/assessment";
import { useAuth } from "../auth/useAuth";

const NIVEAUX = {
  FACILE: { label: "Plutôt facile", repartition: { facile: 70, moyen: 25, difficile: 5 } },
  EQUILIBRE: { label: "Équilibré", repartition: { facile: 30, moyen: 50, difficile: 20 } },
  DIFFICILE: { label: "Plutôt difficile", repartition: { facile: 10, moyen: 30, difficile: 60 } },
};

const EMPTY_FORM = {
  titre: "",
  matiere: "",
  mode: "auto",
  nombre: 5,
  niveau: "EQUILIBRE",
  questionIds: [],
  themes: "",
  dateDebut: "",
  dateFin: "",
  consignes: "",
};

export default function Assessments() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bank, setBank] = useState(null);
  const [scheduling, setScheduling] = useState(null); // { id, date }

  // Mode manuel : questions actives de la matière saisie, à cocher.
  useEffect(() => {
    if (form.mode !== "manuel" || !form.matiere.trim()) return undefined;
    const timer = setTimeout(() => {
      listQuestions({ subject: form.matiere.trim(), limit: 100 })
        .then((res) => setBank(res.items))
        .catch((err) => setError(err.message));
    }, 300);
    return () => clearTimeout(timer);
  }, [form.mode, form.matiere]);

  const selectedQuestions = (bank ?? []).filter((q) => form.questionIds.includes(q._id));
  const bareme = selectedQuestions.reduce((total, q) => total + q.points, 0);

  function toggleQuestion(id) {
    setForm({
      ...form,
      questionIds: form.questionIds.includes(id) ? form.questionIds.filter((q) => q !== id) : [...form.questionIds, id],
    });
  }

  function load() {
    // Un enseignant gère ses propres évaluations ; l'administrateur les voit toutes.
    listAssessments(user.role === "ENSEIGNANT" ? { enseignantId: user.id } : {})
      .then(setAssessments)
      .catch((err) => setError(err.message));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        titre: form.titre,
        matiere: form.matiere,
        dateDebut: form.dateDebut ? new Date(form.dateDebut).toISOString() : undefined,
        dateFin: form.dateFin ? new Date(form.dateFin).toISOString() : undefined,
        consignes: form.consignes || undefined,
      };

      if (form.mode === "auto") {
        payload.generationAuto = {
          matiere: form.matiere,
          nombre: Number(form.nombre),
          repartitionDifficulte: NIVEAUX[form.niveau].repartition,
          themes: form.themes
            ? form.themes.split(",").map((t) => t.trim()).filter(Boolean)
            : [],
        };
      } else {
        payload.questionIds = selectedQuestions.map((q) => q._id);
        payload.bareme = bareme;
      }

      await createAssessment(payload);
      setForm(EMPTY_FORM);
      setShowAdvanced(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublish(id) {
    setActionError(null);
    try {
      await publishAssessment(id);
      load();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleSchedule(e) {
    e.preventDefault();
    setActionError(null);
    try {
      await scheduleAssessment(scheduling.id, new Date(scheduling.date).toISOString());
      setScheduling(null);
      load();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleCancel(id) {
    setActionError(null);
    try {
      await cancelAssessment(id);
      load();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <>
      <h1 className="text-[28px] font-extrabold tracking-tight">
        Gestion des <span className="text-ink-faint">évaluations</span>
      </h1>

      {error && <StateBlock title="Erreur" hint={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5 items-start">
        <Card>
          <CardHeader title="Nouvelle évaluation" />
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="field-label">Titre</label>
              <input
                className="field-input"
                required
                placeholder="Ex. Partiel de mi-semestre"
                value={form.titre}
                onChange={(e) => setForm({ ...form, titre: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="field-label">Matière</label>
              <input
                className="field-input"
                required
                placeholder="Ex. Systèmes distribués"
                value={form.matiere}
                onChange={(e) => setForm({ ...form, matiere: e.target.value })}
              />
            </div>

            {form.mode === "auto" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="field-label">Nombre de questions</label>
                  <input
                    className="field-input"
                    type="number"
                    min="1"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="field-label">Niveau de difficulté</label>
                  <div className="segmented">
                    {Object.entries(NIVEAUX).map(([key, { label }]) => (
                      <button
                        key={key}
                        type="button"
                        className={`segmented-btn${form.niveau === key ? " segmented-btn-active" : ""}`}
                        onClick={() => setForm({ ...form, niveau: key })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="field-label">Questions à inclure</span>
                  {!form.matiere.trim() && <span className="text-xs text-ink-muted">Saisissez d'abord la matière.</span>}
                  {form.matiere.trim() && bank && bank.length === 0 && (
                    <span className="text-xs text-ink-muted">Aucune question active pour cette matière.</span>
                  )}
                  {form.matiere.trim() && bank && bank.length > 0 && (
                    <div className="flex flex-col gap-1 max-h-64 overflow-y-auto rounded-xl border border-border p-2">
                      {bank.map((q) => (
                        <label key={q._id} className="flex items-start gap-2 text-[13px] p-1.5 rounded-lg hover:bg-shell cursor-pointer">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={form.questionIds.includes(q._id)}
                            onChange={() => toggleQuestion(q._id)}
                          />
                          <span>
                            {q.statement.length > 70 ? `${q.statement.slice(0, 70)}…` : q.statement}
                            <span className="block text-xs text-ink-muted">
                              {QUESTION_TYPE_LABELS[q.type]} · {DIFFICULTY_LABELS[q.difficulty]} · {q.points} pt · {q.chapter}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  <span className="text-xs text-ink-muted">
                    {form.questionIds.length} question(s) · barème total {bareme}
                  </span>
                </div>
              </>
            )}

            <button
              type="button"
              className="text-xs font-semibold text-ink-muted hover:text-primary text-left"
              onClick={() => setForm({ ...form, mode: form.mode === "auto" ? "manuel" : "auto" })}
            >
              {form.mode === "auto" ? "Choisir les questions moi-même →" : "← Revenir à la génération automatique"}
            </button>

            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-primary"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              <ChevronDown size={14} className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              Options avancées (dates, thèmes, consignes)
            </button>

            {showAdvanced && (
              <div className="flex flex-col gap-4 rounded-xl bg-shell p-3.5">
                {form.mode === "auto" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="field-label">Thèmes (facultatif, séparés par virgule)</label>
                    <input
                      className="field-input"
                      value={form.themes}
                      onChange={(e) => setForm({ ...form, themes: e.target.value })}
                      placeholder="REST, gRPC, Messaging"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="field-label">Date de début</label>
                    <input
                      className="field-input"
                      type="datetime-local"
                      value={form.dateDebut}
                      onChange={(e) => setForm({ ...form, dateDebut: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="field-label">Date de fin</label>
                    <input
                      className="field-input"
                      type="datetime-local"
                      value={form.dateFin}
                      onChange={(e) => setForm({ ...form, dateFin: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="field-label">Consignes</label>
                  <textarea
                    className="field-textarea"
                    value={form.consignes}
                    onChange={(e) => setForm({ ...form, consignes: e.target.value })}
                  />
                </div>
              </div>
            )}

            <Button type="submit" disabled={submitting}>
              <Plus size={16} />
              {submitting ? "Création…" : "Créer l'évaluation"}
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Évaluations" subtitle={assessments ? `${assessments.length} évaluation(s)` : ""} />
          {actionError && <StateBlock title="Action impossible" hint={actionError} />}

          {assessments === null && <StateBlock title="Chargement…" />}
          {assessments && assessments.length === 0 && (
            <StateBlock title="Aucune évaluation" hint="Créez votre première évaluation avec le formulaire ci-contre." />
          )}
          {assessments && assessments.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Matière</th>
                  <th>Statut</th>
                  <th>Questions</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {assessments.map((a) => (
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
                      {a.status === "PLANIFIEE" && (
                        <span className="block text-xs text-ink-muted mt-1">le {formatDateTime(a.datePublication)}</span>
                      )}
                      {scheduling?.id === a._id && (
                        <form className="flex items-center gap-1.5 mt-2" onSubmit={handleSchedule}>
                          <input
                            className="field-input !py-1.5"
                            type="datetime-local"
                            required
                            aria-label="Date de publication"
                            value={scheduling.date}
                            onChange={(e) => setScheduling({ ...scheduling, date: e.target.value })}
                          />
                          <Button size="sm" type="submit">
                            OK
                          </Button>
                        </form>
                      )}
                    </td>
                    <td>{a.questionIds?.length ?? 0}</td>
                    <td>
                      <div className="flex gap-2">
                        {["BROUILLON", "PLANIFIEE"].includes(a.status) && (
                          <button
                            className="icon-action icon-action-positive"
                            onClick={() => handlePublish(a._id)}
                            aria-label="Publier"
                            title="Publier"
                          >
                            <Send size={15} />
                          </button>
                        )}
                        {["BROUILLON", "PLANIFIEE"].includes(a.status) && (
                          <button
                            className="icon-action icon-action-positive"
                            onClick={() => setScheduling(scheduling?.id === a._id ? null : { id: a._id, date: "" })}
                            aria-label="Planifier la publication"
                            title="Planifier la publication"
                          >
                            <CalendarClock size={15} />
                          </button>
                        )}
                        {["PLANIFIEE", "PUBLIEE"].includes(a.status) && (
                          <button
                            className="icon-action"
                            onClick={() => handleCancel(a._id)}
                            aria-label="Annuler"
                            title="Annuler"
                          >
                            <Ban size={15} />
                          </button>
                        )}
                      </div>
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
