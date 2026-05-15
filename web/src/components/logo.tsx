export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}
    >
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-md bg-primary font-mono text-sm text-primary-foreground"
      >
        {"</>"}
      </span>
      <span>
        Sistema <span className="text-primary">Jogos</span>
      </span>
    </span>
  );
}
