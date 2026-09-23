import { useEffect, useState } from "react";
import { Plus, Send, Ban } from "lucide-react";
import { Card, CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StateBlock from "../components/ui/StateBlock";
import { listAssessments, createAssessment, publishAssessment, cancelAssessment } from "../api/assessments";
import { STATUS_LABELS, STATUS_TONES } from "../constants/assessment";
import "./Dashboard.css";
import "./Assessments.css";

const EMPTY_FORM = {
  titre: "",
  enseignantId: "ens-demo",
  matiere: "",
  mode: "auto",
  questionIds: "",
  bareme: "",
  nombre: 5,
  facile: 30,
  moyen: 50,
  difficile: 20,
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
        enseignantId: form.enseignantId,
        matiere: form.matiere,
        dateDebut: form.dateDebut || undefined,
        dateFin: form.dateFin || undefined,
        consignes: form.consignes || undefined,
      };

      if (form.mode === "auto") {
        payload.generationAuto = {
          matiere: form.matiere,
          nombre: Number(form.nombre),
          repartitionDifficulte: {
            facile: Number(form.facile),
            moyen: Number(form.moyen),
            difficile: Number(form.difficile),
          },
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
      <div className="page-header">
        <h1 className="page-title">
          Gestion des <span>évaluations</span>
        </h1>
      </div>

      {error && <StateBlock title="Erreur" hint={error} />}

      <div className="questions-layout">
        <Card className="questions-form-card">
          <CardHeader title="Nouvelle évaluation" />
          <form className="question-form" onSubmit={handleSubmit}>
            <div className="field">
              <label className="field-label">Titre</label>
              <input
                className="field-input"
                required
                value={form.titre}
                onChange={(e) => setForm({ ...form, titre: e.target.value })}
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label">Matière</label>
                <input
                  className="field-input"
                  required
                  value={form.matiere}
                  onChange={(e) => setForm({ ...form, matiere: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-label">Enseignant</label>
                <input
                  className="field-input"
                  required
                  value={form.enseignantId}
                  onChange={(e) => setForm({ ...form, enseignantId: e.target.value })}
                />
              </div>
            </div>

            <div className="mode-toggle">
              <button
                type="button"
                className={form.mode === "auto" ? "active" : ""}
                onClick={() => setForm({ ...form, mode: "auto" })}
              >
                Génération automatique
              </button>
              <button
                type="button"
                className={form.mode === "manuel" ? "active" : ""}
                onClick={() => setForm({ ...form, mode: "manuel" })}
              >
                Sélection manuelle
              </button>
            </div>

            {form.mode === "auto" ? (
              <>
                <div className="field-row">
                  <div className="field">
                    <label className="field-label">Nombre de questions</label>
                    <input
                      className="field-input"
                      type="number"
                      min="1"
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Thèmes (séparés par virgule)</label>
                    <input
                      className="field-input"
                      value={form.themes}
                      onChange={(e) => setForm({ ...form, themes: e.target.value })}
                      placeholder="REST, gRPC, Messaging"
                    />
                  </div>
                </div>
                <div className="field-row field-row--3">
                  <div className="field">
                    <label className="field-label">% Facile</label>
                    <input
                      className="field-input"
                      type="number"
                      value={form.facile}
                      onChange={(e) => setForm({ ...form, facile: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">% Moyen</label>
                    <input
                      className="field-input"
                      type="number"
                      value={form.moyen}
                      onChange={(e) => setForm({ ...form, moyen: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">% Difficile</label>
                    <input
                      className="field-input"
                      type="number"
                      value={form.difficile}
                      onChange={(e) => setForm({ ...form, difficile: e.target.value })}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="field">
                  <label className="field-label">IDs des questions (séparés par virgule)</label>
                  <textarea
                    className="field-textarea"
                    value={form.questionIds}
                    onChange={(e) => setForm({ ...form, questionIds: e.target.value })}
                  />
                </div>
                <div className="field">
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

            <div className="field-row">
              <div className="field">
                <label className="field-label">Date de début</label>
                <input
                  className="field-input"
                  type="datetime-local"
                  value={form.dateDebut}
                  onChange={(e) => setForm({ ...form, dateDebut: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-label">Date de fin</label>
                <input
                  className="field-input"
                  type="datetime-local"
                  value={form.dateFin}
                  onChange={(e) => setForm({ ...form, dateFin: e.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Consignes</label>
              <textarea
                className="field-textarea"
                value={form.consignes}
                onChange={(e) => setForm({ ...form, consignes: e.target.value })}
              />
            </div>

            <Button type="submit" disabled={submitting}>
              <Plus size={16} />
              {submitting ? "Création…" : "Créer l'évaluation"}
            </Button>
          </form>
        </Card>

        <Card className="questions-list-card">
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
                  <th>Barème</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {assessments.map((a) => (
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
                    <td className="row-actions">
                      {["BROUILLON", "PLANIFIEE"].includes(a.status) && (
                        <button className="icon-action icon-action--positive" onClick={() => handlePublish(a._id)} aria-label="Publier">
                          <Send size={15} />
                        </button>
                      )}
                      {["PLANIFIEE", "PUBLIEE"].includes(a.status) && (
                        <button className="icon-action" onClick={() => handleCancel(a._id)} aria-label="Annuler">
                          <Ban size={15} />
                        </button>
                      )}
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
