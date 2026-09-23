export default function StateBlock({ title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8 text-ink-muted text-sm text-center">
      <strong className="text-ink">{title}</strong>
      {hint && <span>{hint}</span>}
    </div>
  );
}
