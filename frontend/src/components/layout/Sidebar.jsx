import { NavLink, useNavigate } from "react-router-dom";
import { LayoutGrid, BookOpen, ClipboardList, BarChart3, LogOut, PenLine, Award, CheckSquare } from "lucide-react";
import { useAuth } from "../../auth/useAuth";

// Menu de chaque rôle (l'administrateur ne corrige pas : règle métier 7).
const NAV_ITEMS = [
  { to: "/", icon: LayoutGrid, label: "Tableau de bord", end: true, roles: ["ENSEIGNANT"] },
  { to: "/questions", icon: BookOpen, label: "Questions", roles: ["ENSEIGNANT", "ADMINISTRATEUR"] },
  { to: "/evaluations", icon: ClipboardList, label: "Évaluations", roles: ["ENSEIGNANT", "ADMINISTRATEUR"] },
  { to: "/correction", icon: CheckSquare, label: "Correction", roles: ["ENSEIGNANT"] },
  { to: "/resultats", icon: BarChart3, label: "Résultats", roles: ["ENSEIGNANT", "ADMINISTRATEUR"] },
  { to: "/mes-evaluations", icon: PenLine, label: "Mes évaluations", roles: ["ETUDIANT"] },
  { to: "/mes-resultats", icon: Award, label: "Mes résultats", roles: ["ETUDIANT"] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col justify-between py-2">
      <nav className="pill-surface !rounded-2xl flex flex-col gap-1 p-3">
        {NAV_ITEMS.filter((item) => item.roles.includes(user.role)).map(({ to, icon: Icon, label, end }) => (
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
        <button type="button" className="nav-item" onClick={handleLogout}>
          <LogOut size={19} strokeWidth={2} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
