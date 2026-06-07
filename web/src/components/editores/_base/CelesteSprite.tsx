// Celeste chibi — unicórnia maga, cabelo azul bebê, fofa. PLACEHOLDER em SVG:
// substituir por arte final (PNG/sprite) depois sem mudar a interface (recebe
// só direção para espelhar). Mantido leve e identificável.

export function CelesteSprite({
  size = 72,
  dir = 0,
}: {
  size?: number;
  dir?: number;
}) {
  // Espelha quando "olhando" para a esquerda (90..270 graus).
  const facingLeft = ((dir % 360) + 360) % 360 > 90 && ((dir % 360) + 360) % 360 < 270;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ transform: facingLeft ? "scaleX(-1)" : undefined }}
      aria-label="Celeste"
    >
      {/* corpo / túnica */}
      <ellipse cx="50" cy="78" rx="20" ry="16" fill="#3b4a7a" />
      <path d="M34 70 Q50 96 66 70 Z" fill="#5566aa" />
      {/* braços */}
      <circle cx="30" cy="74" r="5" fill="#f2d2c0" />
      <circle cx="70" cy="70" r="5" fill="#f2d2c0" />
      {/* varinha com estrela */}
      <rect x="71" y="48" width="3" height="22" rx="1.5" fill="#cfd8ff" transform="rotate(20 72 60)" />
      <path d="M82 44 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="#9fe6ff" />
      {/* cabeça */}
      <circle cx="50" cy="44" r="22" fill="#fbe6d8" />
      {/* cabelo azul bebê (franja + laterais) */}
      <path d="M28 44 Q26 20 50 20 Q74 20 72 44 Q66 30 50 30 Q34 30 28 44 Z" fill="#bfe0ff" />
      <path d="M28 44 Q24 58 30 66 Q34 54 32 46 Z" fill="#bfe0ff" />
      <path d="M72 44 Q76 58 70 66 Q66 54 68 46 Z" fill="#a9d4ff" />
      {/* chifre de unicórnio */}
      <path d="M50 8 L46 24 L54 24 Z" fill="#ffe9a8" stroke="#e9c45a" strokeWidth="1" />
      <path d="M50 8 L48 16 M50 12 L52 18" stroke="#e9c45a" strokeWidth="0.8" />
      {/* orelhinhas */}
      <path d="M30 30 l-6 -8 8 4 z" fill="#bfe0ff" />
      <path d="M70 30 l6 -8 -8 4 z" fill="#a9d4ff" />
      {/* olhos */}
      <circle cx="42" cy="46" r="4.5" fill="#2a2f55" />
      <circle cx="58" cy="46" r="4.5" fill="#2a2f55" />
      <circle cx="43.4" cy="44.6" r="1.4" fill="#fff" />
      <circle cx="59.4" cy="44.6" r="1.4" fill="#fff" />
      {/* bochechas + sorriso */}
      <circle cx="36" cy="52" r="2.6" fill="#ffc0cb" opacity="0.8" />
      <circle cx="64" cy="52" r="2.6" fill="#ffc0cb" opacity="0.8" />
      <path d="M45 54 Q50 58 55 54" stroke="#b5697a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* brilhos mágicos */}
      <path d="M20 60 l1 2 2 1 -2 1 -1 2 -1 -2 -2 -1 2 -1 z" fill="#9fe6ff" />
      <path d="M80 70 l1 2 2 1 -2 1 -1 2 -1 -2 -2 -1 2 -1 z" fill="#cfd8ff" />
    </svg>
  );
}
