import { NavLink } from "react-router-dom";
import { LayoutGrid, BookOpen, ClipboardList, BarChart3, Settings, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", icon: LayoutGrid, label: "Tableau de bord", end: true },
  { to: "/questions", icon: BookOpen, label: "Questions" },
  { to: "/evaluations", icon: ClipboardList, label: "Évaluations" },
  { to: "/resultats", icon: BarChart3, label: "Résultats" },
];

export default function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 flex flex-col justify-between py-2">
      <nav className="pill-surface !rounded-2xl flex flex-col gap-1 p-3">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item${isActive ? " nav-item-active" : ""}`}
          >
            <Icon size={19} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="pill-surface !rounded-2xl flex flex-col gap-1 p-3">
        <button type="button" className="nav-item">
          <Settings size={19} strokeWidth={2} />
          Paramètres
        </button>
        <button type="button" className="nav-item">
          <LogOut size={19} strokeWidth={2} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
