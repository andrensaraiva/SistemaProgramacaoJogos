// Detalhe celestial decorativo — Aurora Minimal. Uma constelação sutil (estrelas
// + linhas finas + faíscas). Puramente decorativo: aria-hidden e sem eventos. A
// cor vem de `currentColor` (defina via text-*/opacity no className); o tamanho
// vem de w/h no className. Use com parcimônia, só onde reforça a marca.
export function Constellation({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 120"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
    >
      <g stroke="currentColor" strokeWidth="0.5" opacity="0.45">
        <line x1="20" y1="30" x2="60" y2="55" />
        <line x1="60" y1="55" x2="110" y2="40" />
        <line x1="110" y1="40" x2="150" y2="70" />
        <line x1="150" y1="70" x2="180" y2="45" />
      </g>
      <g fill="currentColor">
        <circle cx="20" cy="30" r="1.6" />
        <circle cx="60" cy="55" r="2.2" />
        <circle cx="110" cy="40" r="1.8" />
        <circle cx="150" cy="70" r="2.4" />
        <circle cx="180" cy="45" r="1.5" />
        <circle cx="90" cy="92" r="1.2" />
        <circle cx="40" cy="82" r="1" />
      </g>
      {/* Faíscas de 4 pontas */}
      <path d="M135 18l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z" fill="currentColor" />
      <path d="M74 22l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="currentColor" />
    </svg>
  );
}
