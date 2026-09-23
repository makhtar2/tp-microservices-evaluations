import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";

export default function Login() {
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    // user-service (authentification) n'est pas encore implémenté côté backend.
    // On navigue directement vers le tableau de bord pour l'instant.
    navigate("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg">
      <div className="w-full max-w-[380px] bg-card rounded-3xl shadow-pop px-6 py-10 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-4">
          <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="32" fill="#163832" />
            <path d="M20 22H40M20 32H36M20 42H40" stroke="#39B372" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <span className="text-lg font-extrabold text-primary">Evalio</span>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight">Bon retour</h1>
        <p className="text-ink-muted text-sm mb-4">Connectez-vous pour gérer vos évaluations.</p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="field-label">Email</label>
            <input className="field-input" type="email" required placeholder="enseignant@etablissement.fr" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="field-label">Mot de passe</label>
            <input className="field-input" type="password" required placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full mt-2">
            Se connecter
          </Button>
        </form>

        <p className="mt-5 text-xs text-ink-faint text-center">
          Authentification non branchée — <code className="bg-shell px-1.5 py-0.5 rounded-md">user-service</code> reste à
          implémenter (Groupe 2).
        </p>
      </div>
    </div>
  );
}
