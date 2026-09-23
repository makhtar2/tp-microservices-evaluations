import { NavLink } from "react-router-dom";
import { LayoutGrid, BookOpen, ClipboardList, BarChart3, Settings, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", icon: LayoutGrid, label: "Tableau de bord", end: true },
  { to: "/questions", icon: BookOpen, label: "Banque de questions" },
  { to: "/evaluations", icon: ClipboardList, label: "Évaluations" },
  { to: "/resultats", icon: BarChart3, label: "Résultats" },
];

export default function Sidebar() {
  return (
    <aside className="w-[76px] flex-shrink-0 flex flex-col justify-between py-2">
      <nav className="pill-surface flex flex-col items-center gap-3 p-3">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `sidebar-icon${isActive ? " sidebar-icon-active" : ""}`}
            title={label}
            aria-label={label}
          >
            <Icon size={20} strokeWidth={2} />
          </NavLink>
        ))}
      </nav>
      <div className="pill-surface flex flex-col items-center gap-2 p-3">
        <button type="button" className="sidebar-icon" title="Paramètres" aria-label="Paramètres">
          <Settings size={20} strokeWidth={2} />
        </button>
        <button type="button" className="sidebar-icon" title="Déconnexion" aria-label="Déconnexion">
          <LogOut size={20} strokeWidth={2} />
        </button>
      </div>
    </aside>
  );
}
