export function StatCard({ label, value, caption, tone = "default" }) {
  const toneClasses = {
    default: "from-white/5 to-transparent",
    accent: "from-accent/20 to-transparent",
    success: "from-success/20 to-transparent",
    warning: "from-warning/20 to-transparent",
  };

  return (
    <article
      className={`panel relative overflow-hidden px-5 py-5 before:absolute before:inset-0 before:bg-gradient-to-br ${toneClasses[tone] ?? toneClasses.default} before:content-['']`}
    >
      <div className="relative">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">{label}</p>
        <p className="mt-4 font-display text-3xl font-semibold text-ink">{value}</p>
        {caption ? <p className="mt-3 text-sm leading-6 text-muted">{caption}</p> : null}
      </div>
    </article>
  );
}
