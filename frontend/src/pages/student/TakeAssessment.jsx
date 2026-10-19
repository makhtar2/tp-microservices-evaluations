import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Paperclip, Send, Upload } from "lucide-react";
import { Card, CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import StateBlock from "../../components/ui/StateBlock";
import { getAssessment } from "../../api/assessments";
import { getQuestion } from "../../api/questions";
import {
  listSubmissions,
  openSubmission,
  saveAnswers,
  uploadFile,
  submitSubmission,
  fileUrl,
} from "../../api/submissions";
import {
  QUESTION_TYPE_LABELS,
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_STATUS_TONES,
  formatDateTime,
} from "../../constants/assessment";

const AUTOSAVE_DELAY_MS = 1500;

// Champ de réponse selon le type de question. Les QCM à plusieurs bonnes
// réponses se répondent en cochant plusieurs options (envoyées séparées
// par "|", format attendu par la correction automatique).
function AnswerField({ question, value, onChange, disabled }) {
  const name = `q-${question._id}`;

  if (question.type === "QCM") {
    const chosen = value ? value.split("|") : [];
    const toggle = (text) =>
      onChange((chosen.includes(text) ? chosen.filter((c) => c !== text) : [...chosen, text]).join("|"));
    return (
      <div className="flex flex-col gap-2">
        {(question.answers || []).map(({ text }) => (
          <label key={text} className="flex items-center gap-2.5 text-sm cursor-pointer">
            <input type="checkbox" checked={chosen.includes(text)} onChange={() => toggle(text)} disabled={disabled} />
            {text}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "VRAI_FAUX") {
    return (
      <div className="flex gap-5">
        {["Vrai", "Faux"].map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} disabled={disabled} />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "QUESTION_COURTE") {
    return (
      <input
        className="field-input"
        aria-label="Votre réponse"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    );
  }

  return (
    <textarea
      className="field-textarea min-h-[120px]"
      aria-label="Votre réponse"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}

export default function TakeAssessment() {
  const { assessmentId } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [submission, setSubmission] = useState(undefined); // undefined = chargement, null = pas encore ouverte
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [saveState, setSaveState] = useState(null); // { saving } | { savedAt } | { error }
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [busy, setBusy] = useState(false);
  const dirty = useRef(new Set());

  useEffect(() => {
    Promise.all([getAssessment(assessmentId), listSubmissions({ assessmentId })])
      .then(async ([a, submissions]) => {
        setAssessment(a);
        const mine = submissions[0] ?? null;
        setSubmission(mine);
        setAnswers(Object.fromEntries((mine?.reponses ?? []).map((r) => [r.questionId, r.reponse])));
        setQuestions(await Promise.all((a.questionIds || []).map(getQuestion)));
      })
      .catch((err) => setError(err.message));
  }, [assessmentId]);

  const editable = submission?.status === "EN_COURS";

  async function flush() {
    if (!submission || dirty.current.size === 0) return;
    const reponses = [...dirty.current].map((questionId) => ({ questionId, reponse: answers[questionId] ?? "" }));
    dirty.current = new Set();
    setSaveState({ saving: true });
    try {
      const updated = await saveAnswers(submission.id, reponses);
      setSubmission(updated);
      setSaveState({ savedAt: new Date() });
    } catch (err) {
      reponses.forEach((r) => dirty.current.add(r.questionId));
      setSaveState({ error: err.message });
      if (err.status === 409) refreshSubmission();
    }
  }

  // Enregistrement automatique quelques instants après la dernière saisie.
  useEffect(() => {
    if (!editable || dirty.current.size === 0) return undefined;
    const timer = setTimeout(flush, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  async function refreshSubmission() {
    const [mine] = await listSubmissions({ assessmentId });
    setSubmission(mine ?? null);
  }

  function handleChange(questionId, value) {
    dirty.current.add(questionId);
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleOpen() {
    setBusy(true);
    setError(null);
    try {
      setSubmission(await openSubmission(assessmentId));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await uploadFile(submission.id, file);
      await refreshSubmission();
    } catch (err) {
      setError(err.message);
      if (err.status === 409) refreshSubmission();
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      await flush();
      setSubmission(await submitSubmission(submission.id));
      setConfirmSubmit(false);
    } catch (err) {
      setError(err.message);
      refreshSubmission();
    } finally {
      setBusy(false);
    }
  }

  if (error && !assessment) return <StateBlock title="Évaluation introuvable" hint={error} />;
  if (!assessment || questions === null || submission === undefined) return <StateBlock title="Chargement…" />;

  const now = new Date();
  const notYetOpen = assessment.dateDebut && now < new Date(assessment.dateDebut);
  const closed = assessment.dateFin && now > new Date(assessment.dateFin);

  return (
    <>
      <Link to="/mes-evaluations" className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-primary w-fit">
        <ArrowLeft size={16} /> Mes évaluations
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight">{assessment.titre}</h1>
          <p className="text-ink-muted text-sm">
            {assessment.matiere} · {questions.length} question(s) · barème {assessment.bareme} ·{" "}
            {assessment.dateFin ? `à rendre avant le ${formatDateTime(assessment.dateFin)}` : "sans date limite"}
          </p>
        </div>
        {submission && (
          <Badge tone={SUBMISSION_STATUS_TONES[submission.status]}>{SUBMISSION_STATUS_LABELS[submission.status]}</Badge>
        )}
      </div>

      {assessment.consignes && (
        <Card>
          <CardHeader title="Consignes" />
          <p className="text-sm whitespace-pre-line">{assessment.consignes}</p>
        </Card>
      )}

      {error && <StateBlock title="Action impossible" hint={error} />}

      {submission?.incidentCorrection && (
        <StateBlock
          title="Correction retardée"
          hint="Votre copie a bien été reçue, mais sa correction automatique a échoué. Votre enseignant a été prévenu."
        />
      )}

      {!submission && (
        <Card>
          {notYetOpen ? (
            <StateBlock title="Évaluation pas encore ouverte" hint={`Ouverture le ${formatDateTime(assessment.dateDebut)}.`} />
          ) : closed ? (
            <StateBlock title="Évaluation fermée" hint="La date limite est dépassée." />
          ) : (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <p className="text-sm text-ink-muted">Vos réponses seront enregistrées au fur et à mesure.</p>
              <Button onClick={handleOpen} disabled={busy}>
                Commencer l'évaluation
              </Button>
            </div>
          )}
        </Card>
      )}

      {submission &&
        questions.map((q, index) => (
          <Card key={q._id}>
            <CardHeader
              title={`Question ${index + 1}`}
              subtitle={`${QUESTION_TYPE_LABELS[q.type] ?? q.type} · ${q.points} point(s)`}
            />
            <p className="text-sm mb-4 whitespace-pre-line">{q.statement}</p>
            <AnswerField
              question={q}
              value={answers[q._id]}
              onChange={(value) => handleChange(q._id, value)}
              disabled={!editable}
            />
          </Card>
        ))}

      {submission && (
        <Card>
          <CardHeader title="Fichiers joints" subtitle="Devoir, annexes… (PDF, documents, archives, images, code source)" />
          {submission.fichiers.length === 0 ? (
            <p className="text-sm text-ink-muted mb-3">Aucun fichier déposé.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 mb-3">
              {submission.fichiers.map((f) => (
                <li key={f.id} className="flex items-center gap-2 text-sm">
                  <Paperclip size={14} />
                  <a className="text-primary underline" href={fileUrl(f)} target="_blank" rel="noreferrer">
                    {f.nomFichier}
                  </a>
                  <span className="text-ink-faint text-xs">{formatDateTime(f.deposedAt)}</span>
                </li>
              ))}
            </ul>
          )}
          {editable && (
            <label className="btn btn-secondary w-fit cursor-pointer">
              <Upload size={16} /> Déposer un fichier
              <input type="file" className="hidden" onChange={handleUpload} disabled={busy} />
            </label>
          )}
        </Card>
      )}

      {editable && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span className="text-xs text-ink-muted" aria-live="polite">
            {saveState?.saving && "Enregistrement…"}
            {saveState?.savedAt && `Réponses enregistrées à ${saveState.savedAt.toLocaleTimeString("fr-FR")}`}
            {saveState?.error && `Échec de l'enregistrement : ${saveState.error}`}
          </span>
          {confirmSubmit ? (
            <div className="flex items-center gap-2">
              <span className="text-sm">Soumettre définitivement ? Vous ne pourrez plus modifier vos réponses.</span>
              <Button variant="secondary" onClick={() => setConfirmSubmit(false)} disabled={busy}>
                Annuler
              </Button>
              <Button onClick={handleSubmit} disabled={busy}>
                <Send size={16} /> Confirmer
              </Button>
            </div>
          ) : (
            <Button onClick={() => setConfirmSubmit(true)}>
              <Send size={16} /> Soumettre ma copie
            </Button>
          )}
        </div>
      )}

      {submission?.status === "SOUMISE" && (
        <StateBlock
          title={`Copie soumise le ${formatDateTime(submission.soumiseAt)}`}
          hint="Votre résultat apparaîtra dans « Mes résultats » après sa publication par l'enseignant."
        />
      )}
    </>
  );
}
