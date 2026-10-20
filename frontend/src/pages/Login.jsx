import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { homePath, useAuth } from "../auth/useAuth";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={homePath(user.role)} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const loggedIn = await login(email, password);
      navigate(location.state?.from || homePath(loggedIn.role), { replace: true });
    } catch (err) {
      setError(err.status === 401 ? err.message : "Connexion impossible : le serveur ne répond pas.");
    } finally {
      setSubmitting(false);
    }
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
        <p className="text-ink-muted text-sm mb-4">Connectez-vous pour accéder à vos évaluations.</p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="field-input"
              type="email"
              autoComplete="username"
              required
              placeholder="enseignant@evaluations.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="field-label" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              className="field-input"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger bg-danger-soft rounded-xl px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full mt-2" disabled={submitting}>
            {submitting ? "Connexion…" : "Se connecter"}
          </Button>
        </form>
      </div>
    </div>
  );
}
