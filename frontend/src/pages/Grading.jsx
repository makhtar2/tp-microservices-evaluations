import { useEffect, useState } from "react";
import { Check, RotateCcw, Save, Undo2 } from "lucide-react";
import { Card, CardHeader } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StateBlock from "../components/ui/StateBlock";
import { listPending, getGrading, gradeQuestion, validateGrading, retryGrading } from "../api/gradings";
import { getQuestion } from "../api/questions";
import { listAssessments } from "../api/assessments";
import { reopenSubmission } from "../api/submissions";
import { useAuth } from "../auth/useAuth";
import { useStudentNames } from "../hooks/useStudentNames";
import { QUESTION_TYPE_LABELS, formatDateTime } from "../constants/assessment";

const GRADING_STATUS = {
  CORRECTION_AUTO_PARTIELLE: { label: "Questions à corriger", tone: "warning" },
  EN_CORRECTION_MANUELLE: { label: "À valider", tone: "positive" },
  EN_ATTENTE: { label: "Correction auto en attente", tone: "neutral" },
  ECHEC_CORRECTION: { label: "Correction auto en échec", tone: "danger" },
  VALIDEE: { label: "Validée", tone: "positive" },
};

// Une question de la copie : réponse de l'étudiant, note (automatique ou
// manuelle) modifiable par l'enseignant, avec un commentaire.
function QuestionGrade({ item, question, onSave, disabled }) {
  const [note, setNote] = useState(item.note ?? "");
  const [commentaire, setCommentaire] = useState(item.commentaire ?? "");
  const [saving, setSaving] = useState(false);
  const changed = String(note) !== String(item.note ?? "") || commentaire !== (item.commentaire ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(item.questionId, { note: Number(note), commentaire: commentaire || undefined });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5 border-b border-border pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge tone="neutral">{QUESTION_TYPE_LABELS[item.type] ?? item.type}</Badge>
        {item.note === null ? (
          <Badge tone="warning">À corriger</Badge>
        ) : (
          <Badge tone={item.correctionAutomatique ? "positive" : "neutral"}>
            {item.correctionAutomatique ? "Corrigée automatiquement" : "Corrigée manuellement"}
          </Badge>
        )}
      </div>
      <p className="text-sm font-semibold whitespace-pre-line">{question?.statement ?? item.questionId}</p>
      {question?.correction && <p className="text-xs text-ink-muted">Guide de correction : {question.correction}</p>}
      <div className="rounded-xl bg-shell p-3 text-sm whitespace-pre-line">
        {item.reponse ? item.reponse : <span className="text-ink-faint">Pas de réponse</span>}
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5 w-28">
          <label className="field-label" htmlFor={`note-${item.questionId}`}>
            Note / {item.pointsMax}
          </label>
          <input
            id={`note-${item.questionId}`}
            className="field-input"
            type="number"
            min="0"
            max={item.pointsMax}
            step="0.25"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <label className="field-label" htmlFor={`com-${item.questionId}`}>
            Commentaire
          </label>
          <input
            id={`com-${item.questionId}`}
            className="field-input"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            disabled={disabled}
          />
        </div>
        <Button variant="secondary" onClick={handleSave} disabled={disabled || saving || note === "" || !changed}>
          <Save size={15} /> Enregistrer
        </Button>
      </div>
    </div>
  );
}

// Règle métier 3 : l'enseignant rouvre une copie pour que l'étudiant la
// soumette à nouveau. Une nouvelle date limite est exigée si l'évaluation
// est terminée.
function ReopenForm({ dateFin, onReopen, disabled }) {
  const [open, setOpen] = useState(false);
  const [dateLimite, setDateLimite] = useState("");
  const [motif, setMotif] = useState("");
  const ended = dateFin && new Date(dateFin) < new Date();

  if (!open) {
    return (
      <Button variant="secondary" className="w-fit" onClick={() => setOpen(true)} disabled={disabled}>
        <Undo2 size={16} /> Autoriser une resoumission
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <p className="text-sm">
        La copie redevient modifiable par l'étudiant, qui sera prévenu. La correction en cours est abandonnée.
      </p>
      <div className="flex gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <label className="field-label" htmlFor="reopen-date">
            Nouvelle date limite{ended ? "" : " (facultative)"}
          </label>
          <input
            id="reopen-date"
            className="field-input"
            type="datetime-local"
            value={dateLimite}
            onChange={(e) => setDateLimite(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <label className="field-label" htmlFor="reopen-motif">
            Motif (facultatif)
          </label>
          <input id="reopen-motif" className="field-input" value={motif} onChange={(e) => setMotif(e.target.value)} />
        </div>
      </div>
      {ended && <p className="text-xs text-ink-muted">L'évaluation est terminée : une nouvelle date limite est requise.</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={disabled}>
          Annuler
        </Button>
        <Button
          onClick={() => onReopen({ dateLimite: dateLimite ? new Date(dateLimite).toISOString() : undefined, motif })}
          disabled={disabled || (ended && !dateLimite)}
        >
          <Undo2 size={16} /> Rouvrir la copie
        </Button>
      </div>
    </div>
  );
}

export default function Grading() {
  const { user } = useAuth();
  const studentName = useStudentNames();
  const [pending, setPending] = useState(null);
  const [assessments, setAssessments] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [grading, setGrading] = useState(null);
  const [questions, setQuestions] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  async function loadPending() {
    try {
      // Copies de l'enseignant à corriger, et corrections automatiques à
      // relancer (leur enseignant n'est connu qu'une fois l'évaluation lue).
      const [mine, withFailed, list] = await Promise.all([
        listPending({ enseignantId: user.id }),
        listPending({ includeFailed: true }),
        listAssessments({ enseignantId: user.id }),
      ]);
      const ownAssessments = Object.fromEntries(list.map((a) => [a._id, a]));
      const failed = withFailed.filter(
        (g) => ["EN_ATTENTE", "ECHEC_CORRECTION"].includes(g.status) && ownAssessments[g.assessmentId]
      );
      setAssessments(ownAssessments);
      setPending([...failed, ...mine]);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function select(submissionId) {
    setSelectedId(submissionId);
    setGrading(null);
    setError(null);
    setNotice(null);
    try {
      const g = await getGrading(submissionId);
      setGrading(g);
      const loaded = await Promise.all(g.notes.map((n) => getQuestion(n.questionId).catch(() => null)));
      setQuestions(Object.fromEntries(g.notes.map((n, i) => [n.questionId, loaded[i]])));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveQuestion(questionId, values) {
    setError(null);
    try {
      setGrading(await gradeQuestion(grading.submissionId, questionId, values));
    } catch (err) {
      setError(err.message);
    }
  }

  async function run(action) {
    setBusy(true);
    setError(null);
    try {
      const updated = await action(grading.submissionId);
      if (updated.status === "VALIDEE") {
        // Copie terminée : elle quitte la liste, le détail se referme.
        setSelectedId(null);
        setGrading(null);
        setNotice(`Résultat publié pour ${studentName(updated.etudiantId)} (note ${updated.scoreTotal}).`);
      } else {
        setGrading(updated);
      }
      await loadPending();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReopen(submissionId, etudiantId, values) {
    setBusy(true);
    setError(null);
    try {
      await reopenSubmission(submissionId, values);
      // grading-service abandonne la correction de façon asynchrone : on la
      // retire tout de suite de la liste plutôt que de la recharger.
      setSelectedId(null);
      setGrading(null);
      setPending((list) => list.filter((g) => g.submissionId !== submissionId));
      setNotice(`Copie rouverte : ${studentName(etudiantId)} peut la modifier et la soumettre à nouveau.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const failed = grading && ["EN_ATTENTE", "ECHEC_CORRECTION"].includes(grading.status);
  const remaining = grading ? grading.notes.filter((n) => n.note === null).length : 0;

  return (
    <>
      <h1 className="text-[28px] font-extrabold tracking-tight">
        Correction des <span className="text-ink-faint">copies</span>
      </h1>

      {error && <StateBlock title="Action impossible" hint={error} />}
      {notice && (
        <p role="status" className="text-sm text-accent-soft-text bg-accent-soft rounded-xl px-4 py-2.5">
          {notice}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
        <Card>
          <CardHeader title="Copies en attente" subtitle={pending ? `${pending.length} copie(s)` : ""} />
          {pending === null && !error && <StateBlock title="Chargement…" />}
          {pending && pending.length === 0 && <StateBlock title="Aucune copie à corriger" />}
          <div className="flex flex-col gap-1.5">
            {(pending ?? []).map((g) => (
              <button
                key={g.submissionId}
                type="button"
                onClick={() => select(g.submissionId)}
                className={`text-left rounded-xl px-3 py-2.5 transition-colors ${
                  selectedId === g.submissionId ? "bg-accent-soft" : "hover:bg-shell"
                }`}
              >
                <strong className="block text-[13px]">{assessments[g.assessmentId]?.titre ?? g.assessmentId}</strong>
                <span className="text-xs text-ink-muted block mb-1">{studentName(g.etudiantId)}</span>
                <Badge tone={GRADING_STATUS[g.status]?.tone}>{GRADING_STATUS[g.status]?.label ?? g.status}</Badge>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          {!selectedId && <StateBlock title="Sélectionnez une copie" hint="Choisissez une copie dans la liste." />}
          {selectedId && !grading && !error && <StateBlock title="Chargement…" />}
          {grading && (
            <>
              <CardHeader
                title={assessments[grading.assessmentId]?.titre ?? "Copie"}
                subtitle={`${studentName(grading.etudiantId)} · score actuel ${grading.scoreTotal}`}
                action={<Badge tone={GRADING_STATUS[grading.status]?.tone}>{GRADING_STATUS[grading.status]?.label}</Badge>}
              />

              {failed ? (
                <div className="flex flex-col gap-3">
                  <StateBlock
                    title="La correction automatique n'a pas pu être effectuée"
                    hint={`${grading.lastError ?? "Erreur inconnue"} · ${grading.attempts} tentative(s) · reçue le ${formatDateTime(grading.createdAt)}`}
                  />
                  <Button className="w-fit self-center" onClick={() => run(retryGrading)} disabled={busy}>
                    <RotateCcw size={16} /> Relancer la correction automatique
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {grading.notes.map((item) => (
                    <QuestionGrade
                      key={`${item.questionId}-${item.note}-${item.commentaire}`}
                      item={item}
                      question={questions[item.questionId]}
                      onSave={handleSaveQuestion}
                      disabled={busy}
                    />
                  ))}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    {remaining > 0 && <span className="text-xs text-ink-muted">{remaining} question(s) à noter</span>}
                    <Button onClick={() => run(validateGrading)} disabled={busy || remaining > 0}>
                      <Check size={16} /> Valider et publier le résultat
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-border">
                <ReopenForm
                  key={grading.submissionId}
                  dateFin={assessments[grading.assessmentId]?.dateFin}
                  onReopen={(values) => handleReopen(grading.submissionId, grading.etudiantId, values)}
                  disabled={busy}
                />
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
