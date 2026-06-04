export function Logo({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}
    >
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-lg font-mono text-sm text-white glow-primary"
        style={{
          background: "linear-gradient(135deg, var(--primary), var(--accent))",
        }}
      >
        {"✦"}
      </span>
      {!compact && (
        <span className="text-base">
          Celeste <span className="text-gradient">Academy</span>
        </span>
      )}
    </span>
  );
}
