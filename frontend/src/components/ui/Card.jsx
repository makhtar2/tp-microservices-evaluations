import "./ui.css";

export function Card({ className = "", children, ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="card-header">
      <div>
        <div className="card-title">{title}</div>
        {subtitle && <div className="card-subtitle">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}
