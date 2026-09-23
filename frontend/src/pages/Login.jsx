import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    // user-service (authentification) n'est pas encore implémenté côté backend.
    // On navigue directement vers le tableau de bord pour l'instant.
    navigate("/");
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="32" fill="#163832" />
            <path d="M20 22H40M20 32H36M20 42H40" stroke="#39B372" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <span>Evalio</span>
        </div>

        <h1 className="login-title">Bon retour</h1>
        <p className="login-subtitle">Connectez-vous pour gérer vos évaluations.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label">Email</label>
            <input className="field-input" type="email" required placeholder="enseignant@etablissement.fr" />
          </div>
          <div className="field">
            <label className="field-label">Mot de passe</label>
            <input className="field-input" type="password" required placeholder="••••••••" />
          </div>
          <Button type="submit" className="login-submit">
            Se connecter
          </Button>
        </form>

        <p className="login-note">
          Authentification non branchée — <code>user-service</code> reste à implémenter (Groupe 2).
        </p>
      </div>
    </div>
  );
}
