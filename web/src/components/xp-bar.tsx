// Barra de progresso de XP dentro do nível atual. Cada nível = 100 XP
// (level = floor(xp/100)+1, conforme o trigger de gamificação no banco).
export function XpBar({
  xp,
  level,
  className = "",
}: {
  xp: number;
  level: number;
  className?: string;
}) {
  const noNivel = xp % 100;
  const pct = Math.min(100, noNivel);
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
        <span>Nível {level}</span>
        <span>{noNivel}/100 XP</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="xp-fill h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
