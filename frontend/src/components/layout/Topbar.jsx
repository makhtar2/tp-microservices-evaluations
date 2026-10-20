import { useAuth } from "../../auth/useAuth";

const ROLE_LABELS = { ADMINISTRATEUR: "Administrateur", ENSEIGNANT: "Enseignant", ETUDIANT: "Étudiant" };

export default function Topbar() {
  const { user } = useAuth();
  const initials = `${user.prenom?.[0] ?? ""}${user.nom?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <header className="pill-surface flex items-center justify-between gap-6 py-2 pl-4 pr-3">
      <div className="flex items-center gap-2 flex-shrink-0">
        <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="32" fill="#163832" />
          <path d="M20 22H40M20 32H36M20 42H40" stroke="#39B372" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <span className="font-extrabold text-lg tracking-tight text-primary">Evalio</span>
      </div>

      <div className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-shell text-ink">
        <span className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-primary text-white text-xs font-bold">
          {initials}
        </span>
        <span className="text-sm font-medium">
          {user.prenom} {user.nom}
        </span>
        <span className="text-xs text-ink-muted">· {ROLE_LABELS[user.role] ?? user.role}</span>
      </div>
    </header>
  );
}
