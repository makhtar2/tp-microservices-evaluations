import { ArrowUpRight } from "lucide-react";
import "./StatCard.css";

export default function StatCard({ label, sub, value, dark = false, icon }) {
  return (
    <div className={`stat-card${dark ? " stat-card--dark" : ""}`}>
      <div className="stat-card-top">
        <div>
          <div className="stat-card-label">{label}</div>
          {sub && <div className="stat-card-sub">{sub}</div>}
        </div>
        <span className="stat-card-icon">{icon ?? <ArrowUpRight size={15} />}</span>
      </div>
      <div className="stat-card-value">{value}</div>
    </div>
  );
}
