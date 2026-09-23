import { useEffect, useState } from "react";
import { Plus, Send, Ban, ChevronDown } from "lucide-react";
import { Card, CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StateBlock from "../components/ui/StateBlock";
import { listAssessments, createAssessment, publishAssessment, cancelAssessment } from "../api/assessments";
import { STATUS_LABELS, STATUS_TONES } from "../constants/assessment";

const DEFAULT_ENSEIGNANT_ID = "ens-demo";

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
  questionIds: "",
  bareme: "",
  themes: "",
  dateDebut: "",
  dateFin: "",
  consignes: "",
};

export default function Assessments() {
  const [assessments, setAssessments] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  function load() {
    listAssessments().then(setAssessments).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        titre: form.titre,
        enseignantId: DEFAULT_ENSEIGNANT_ID,
        matiere: form.matiere,
        dateDebut: form.dateDebut || undefined,
        dateFin: form.dateFin || undefined,
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
        payload.questionIds = form.questionIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
        payload.bareme = Number(form.bareme) || 0;
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
                  <label className="field-label">Questions à inclure (IDs séparés par virgule)</label>
                  <textarea
                    className="field-textarea"
                    value={form.questionIds}
                    onChange={(e) => setForm({ ...form, questionIds: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="field-label">Barème total</label>
                  <input
                    className="field-input"
                    type="number"
                    value={form.bareme}
                    onChange={(e) => setForm({ ...form, bareme: e.target.value })}
                  />
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
