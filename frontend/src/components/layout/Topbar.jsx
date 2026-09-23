import { NavLink } from "react-router-dom";
import { Search, Bell, ChevronDown } from "lucide-react";
import "./Topbar.css";

const TABS = [
  { to: "/", label: "Tableau de bord", end: true },
  { to: "/questions", label: "Questions" },
  { to: "/evaluations", label: "Évaluations" },
  { to: "/resultats", label: "Résultats" },
];

export default function Topbar({ user }) {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="topbar-logo">
          <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="32" fill="#163832" />
            <path d="M20 22H40M20 32H36M20 42H40" stroke="#39B372" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </span>
        <span className="topbar-wordmark">Evalio</span>
      </div>

      <nav className="topbar-tabs">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `topbar-tab${isActive ? " topbar-tab--active" : ""}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="topbar-actions">
        <button type="button" className="topbar-iconbtn" aria-label="Rechercher">
          <Search size={18} />
        </button>
        <button type="button" className="topbar-iconbtn topbar-iconbtn--dot" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <button type="button" className="topbar-profile">
          <span className="topbar-avatar">{user?.initials ?? "EN"}</span>
          <span className="topbar-profile-name">{user?.name ?? "Enseignant"}</span>
          <ChevronDown size={16} />
        </button>
      </div>
    </header>
  );
}
