import { NavLink } from "react-router-dom";
import { Search, Bell, ChevronDown } from "lucide-react";

const TABS = [
  { to: "/", label: "Tableau de bord", end: true },
  { to: "/questions", label: "Questions" },
  { to: "/evaluations", label: "Évaluations" },
  { to: "/resultats", label: "Résultats" },
];

export default function Topbar({ user }) {
  return (
    <header className="pill-surface flex items-center gap-6 py-2 pl-4 pr-3">
      <div className="flex items-center gap-2 flex-shrink-0">
        <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="32" fill="#163832" />
          <path d="M20 22H40M20 32H36M20 42H40" stroke="#39B372" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <span className="font-extrabold text-lg tracking-tight text-primary">Evalio</span>
      </div>

      <nav className="hidden md:flex items-center gap-1 bg-shell rounded-full p-1 flex-1 justify-center">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `topbar-tab${isActive ? " topbar-tab-active" : ""}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button type="button" className="icon-btn" aria-label="Rechercher">
          <Search size={18} />
        </button>
        <button type="button" className="icon-btn" aria-label="Notifications">
          <Bell size={18} />
          <span className="absolute top-[9px] right-2.5 w-[7px] h-[7px] rounded-full bg-accent border-2 border-card" />
        </button>
        <button type="button" className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-shell text-ink cursor-pointer">
          <span className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-primary text-white text-xs font-bold">
            {user?.initials ?? "EN"}
          </span>
          <span className="text-sm font-medium">{user?.name ?? "Enseignant"}</span>
          <ChevronDown size={16} />
        </button>
      </div>
    </header>
  );
}
