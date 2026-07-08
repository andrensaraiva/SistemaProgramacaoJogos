// Marca Celeste Academy — Aurora Minimal.
// Lua crescente + faísca num selo celestial; "Celeste" em serifa elegante
// (Cormorant) maior e "Academy" menor com letter-spacing. Premium, não infantil.
export function Logo({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl glow-primary"
        style={{
          background:
            "linear-gradient(135deg, var(--deep-purple, #20133d) 0%, var(--primary) 100%)",
        }}
      >
        {/* Lua crescente */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          className="text-gold-soft"
        >
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            fill="currentColor"
          />
        </svg>
        {/* Faísca/estrela */}
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          className="absolute -right-0.5 -top-0.5 text-moon-cream"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 0l2.2 7.8L22 10l-7.8 2.2L12 20l-2.2-7.8L2 10l7.8-2.2z" />
        </svg>
      </span>

      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-serif text-xl font-semibold tracking-tight text-foreground">
            Celeste
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
            Academy
          </span>
        </span>
      )}
    </span>
  );
}
