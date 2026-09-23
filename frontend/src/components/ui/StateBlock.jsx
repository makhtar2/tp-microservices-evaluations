import "./ui.css";

export default function StateBlock({ title, hint }) {
  return (
    <div className="state-block">
      <strong>{title}</strong>
      {hint && <span>{hint}</span>}
    </div>
  );
}
