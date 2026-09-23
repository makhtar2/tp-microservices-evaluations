import { ArrowUpRight } from "lucide-react";

export default function StatCard({ label, sub, value, dark = false, icon }) {
  return (
    <div className={`stat-card${dark ? " stat-card-dark" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className={`text-[13px] font-semibold ${dark ? "opacity-85" : "text-ink-muted"}`}>{label}</div>
          {sub && <div className={`text-xs mt-0.5 ${dark ? "text-[#cfe3da] opacity-60" : "text-ink-faint"}`}>{sub}</div>}
        </div>
        <span
          className={`flex items-center justify-center w-[30px] h-[30px] rounded-full ${
            dark ? "bg-white/10 text-white" : "bg-shell text-ink"
          }`}
        >
          {icon ?? <ArrowUpRight size={15} />}
        </span>
      </div>
      <div className="text-[32px] font-extrabold tracking-tight">{value}</div>
    </div>
  );
}
