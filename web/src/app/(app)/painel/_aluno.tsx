import type { ReactNode } from "react";
import Link from "next/link";

import { AvatarWithFrame } from "@/components/avatar-with-frame";
import { StudentOnboardingTour } from "@/components/student-onboarding-tour";
import { UpcomingDeadlines, type DeadlineItem } from "@/components/upcoming-deadlines";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { StudentDashboard } from "@/lib/dashboard/student";
import type { StreakInfo } from "@/lib/gamification/streak-actions";

type AvatarInfo = {
  frameId?: string | null;
  skinId?: string | null;
  moedas: number;
};

// Emoji por conquista conhecida (cai num troféu genérico se for nova).
const BADGE_EMOJI: Record<string, string> = {
  first_green: "🌱",
  streak_7: "🔥",
  no_paste: "✋",
};

/** Card de stat clicável que entra com animação. Vira atalho pra outra tela. */
function StatLink({
  href,
  title,
  value,
  hint,
  tone = "text-foreground",
  delay = "",
}: {
  href: string;
  title: string;
  value: ReactNode;
  hint?: string;
  tone?: string;
  delay?: string;
}) {
  return (
    <Link
      href={href}
      className={`reveal-up ${delay} group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg`}
    >
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      <div className={`mt-2 text-3xl font-bold ${tone}`}>{value}</div>
      {hint && (
        <div className="mt-1 text-xs text-muted-foreground transition-colors group-hover:text-primary">
          {hint} →
        </div>
      )}
    </Link>
  );
}

/** Chip de resumo de desempenho: emoji + número grande + rótulo, com gradiente leve. */
function ResumoChip({
  emoji,
  valor,
  label,
  tone,
  bg,
}: {
  emoji: string;
  valor: ReactNode;
  label: string;
  tone: string;
  bg: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-border bg-gradient-to-br ${bg} to-card p-3`}>
      <span className="text-xl">{emoji}</span>
      <div className="min-w-0">
        <div className={`text-xl font-bold leading-none ${tone}`}>{valor}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

const SIT_LABEL: Record<string, string> = {
  reprovado: "Reprovado",
  recuperacao: "Recuperação",
  aprovado: "Aprovado",
};

// Cor/emoji por situação — reaproveitado nas etiquetas e nas barras de média.
const SIT_META: Record<string, { chip: string; bar: string; emoji: string }> = {
  aprovado: { chip: "bg-success/15 text-success", bar: "bg-success", emoji: "✅" },
  recuperacao: { chip: "bg-warning/15 text-warning", bar: "bg-warning", emoji: "⚠️" },
  reprovado: { chip: "bg-danger/15 text-danger", bar: "bg-danger", emoji: "❌" },
};

function sitMeta(situacao: string) {
  return SIT_META[situacao] ?? { chip: "bg-muted text-muted-foreground", bar: "bg-muted", emoji: "•" };
}

function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function prazoRelativo(iso: string | null): string {
  const dias = diasAte(iso);
  if (dias == null) return "";
  if (dias <= 0) return "hoje";
  if (dias === 1) return "amanhã";
  return `em ${dias} dias`;
}

/** Cor da etiqueta de prazo conforme a urgência. */
function prazoTone(iso: string | null): string {
  const dias = diasAte(iso);
  if (dias == null) return "bg-muted text-muted-foreground";
  if (dias <= 0) return "bg-danger/15 text-danger";
  if (dias === 1) return "bg-warning/15 text-warning";
  if (dias <= 3) return "bg-warning/10 text-warning";
  return "bg-muted text-muted-foreground";
}

export function PainelAluno({
  nome,
  dash,
  deadlines,
  streak,
  avatar,
}: {
  nome: string;
  dash: StudentDashboard;
  deadlines: DeadlineItem[];
  streak: StreakInfo;
  avatar: AvatarInfo;
}) {
  const { nivel } = dash;
  const xpTotal = nivel.level > 1 ? (nivel.level - 1) * 100 + nivel.xpNoNivel : nivel.xpNoNivel;

  // Sem turma ainda: onboarding.
  if (dash.turmas.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <StudentOnboardingTour />
        <PageHeader title={`Olá, ${nome}!`} description="Entre numa turma para começar." />
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold">Entre em uma turma</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Peça o código de convite ao seu professor para começar.
          </p>
          <div className="mt-4">
            <Link href="/turmas/entrar">
              <Button>Entrar com código</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <StudentOnboardingTour />

      {/* HERO de XP animado — coração visual do painel */}
      <div className="reveal-up relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-accent/10 p-6 sm:p-8">
        {/* glow decorativo */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <Link href="/perfil" title="Ver meu perfil" className="pop-in shrink-0 transition-transform hover:scale-105">
            <AvatarWithFrame name={nome} frameId={avatar.frameId} skinId={avatar.skinId} size={72} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
              Olá, <span className="text-gradient">{nome}</span>! 👋
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Nível {nivel.level} · faltam <span className="font-semibold text-foreground">{nivel.faltam} XP</span> para o nível {nivel.level + 1}
            </p>

            {/* Barra de XP grande, com brilho que cruza */}
            <div className="xp-shine relative mt-4 h-4 w-full overflow-hidden rounded-full bg-muted/80">
              <div
                className="xp-fill xp-grow h-full rounded-full"
                style={{ ["--xp-target" as string]: `${Math.max(4, nivel.pct)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>{nivel.xpNoNivel}/100 XP neste nível</span>
              <span>{xpTotal} XP no total</span>
            </div>
          </div>

          {/* Moedas — atalho pra loja */}
          <Link
            href="/perfil"
            title="Gastar na Loja Celeste"
            className="pop-in flex shrink-0 flex-col items-center gap-0.5 rounded-2xl border border-border bg-background/60 px-5 py-3 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
          >
            <span className="text-2xl">🪙</span>
            <span className="text-lg font-bold leading-none">{avatar.moedas}</span>
            <span className="text-[11px] text-muted-foreground">moedas</span>
          </Link>
        </div>
      </div>

      {/* Linha de stats clicáveis + streak */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Streak — ofensiva diária */}
        <Link
          href="/exercicios"
          title="Pratique todo dia pra manter a ofensiva"
          className={`reveal-up reveal-delay-1 group flex items-center gap-4 rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
            streak.atual > 0
              ? "border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-card"
              : "border-border bg-card"
          }`}
        >
          <span className={`text-4xl ${streak.atual > 0 ? "flame-pulse" : "opacity-40 grayscale"}`}>🔥</span>
          <div>
            <div className="text-3xl font-bold leading-none">{streak.atual}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {streak.atual > 0 ? "dias seguidos" : "comece sua ofensiva"}
              {streak.recorde > 0 && <span className="block">recorde: {streak.recorde} dias</span>}
            </div>
          </div>
        </Link>

        <StatLink
          href="/perfil"
          title="Nível"
          value={<span className="text-primary">{nivel.level}</span>}
          hint="ver perfil"
          delay="reveal-delay-2"
        />
        <StatLink
          href="/ranking"
          title="XP total"
          value={xpTotal}
          hint="ver ranking"
          delay="reveal-delay-3"
        />
        <StatLink
          href="/perfil"
          title="Conquistas"
          value={`${dash.conquistas}${dash.conquistasTotal ? `/${dash.conquistasTotal}` : ""}`}
          hint="ver todas"
          delay="reveal-delay-4"
        />
      </div>

      {/* Vitrine de conquistas */}
      <Card className="reveal-up reveal-delay-2">
        <CardHeader
          title="🏅 Conquistas"
          description={
            dash.conquistas > 0
              ? `Você desbloqueou ${dash.conquistas} de ${dash.conquistasTotal} conquistas.`
              : "Resolva exercícios e mantenha a ofensiva pra desbloquear suas primeiras medalhas."
          }
          action={
            <Link href="/perfil" className="text-sm text-primary hover:underline">
              ver perfil →
            </Link>
          }
        />
        {dash.conquistasRecentes.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
            <span className="text-2xl opacity-50">🔒</span>
            Nenhuma conquista ainda — sua primeira vitória te espera!
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {dash.conquistasRecentes.map((c, i) => (
              <div
                key={c.id}
                className={`pop-in reveal-delay-${Math.min(5, i + 1)} flex items-center gap-3 rounded-xl border border-border bg-background/50 px-4 py-3`}
                title={c.descricao ?? undefined}
              >
                <span className="text-2xl">{BADGE_EMOJI[c.id] ?? "🏆"}</span>
                <div>
                  <div className="text-sm font-semibold leading-tight">{c.titulo}</div>
                  {c.descricao && (
                    <div className="text-xs text-muted-foreground">{c.descricao}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pendências em destaque */}
      <Card className="reveal-up reveal-delay-3">
        <CardHeader
          title="📌 A entregar"
          description="Atividades com prazo que você ainda não enviou."
          action={
            dash.pendencias.length > 0 ? (
              <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
                {dash.pendencias.length} pendente{dash.pendencias.length > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                em dia
              </span>
            )
          }
        />
        {dash.pendencias.length === 0 ? (
          <div className="pop-in flex flex-col items-center gap-2 rounded-xl border border-success/30 bg-gradient-to-br from-success/10 to-card py-8 text-center">
            <span className="text-4xl">🎉</span>
            <p className="font-semibold text-success">Tudo entregue!</p>
            <p className="text-sm text-muted-foreground">
              Nenhuma atividade com prazo em aberto. Mandou bem!
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {dash.pendencias.slice(0, 8).map((p) => {
              const urgente = (diasAte(p.dueAt) ?? 99) <= 1;
              return (
                <li key={p.assignmentId}>
                  <Link
                    href={`/turmas/${p.classId}/listas/${p.assignmentId}`}
                    className={`group flex items-center justify-between gap-3 rounded-xl border p-3 text-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      urgente
                        ? "border-danger/30 bg-danger/5"
                        : "border-border bg-background/40 hover:border-primary/40"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="font-medium group-hover:text-primary">{p.titulo}</span>
                      <span className="block truncate text-xs text-muted-foreground">{p.turma}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${prazoTone(p.dueAt)}`}>
                      {prazoRelativo(p.dueAt)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Minhas UCs — rever conteúdo e refazer exercícios */}
      {dash.ucs.length > 0 && (
        <Card className="reveal-up reveal-delay-4">
          <CardHeader
            title="📚 Minhas unidades curriculares"
            description="Reveja as aulas e refaça os exercícios de cada UC."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dash.ucs.map((u) => (
              <Link
                key={u.classUnitId}
                href={`/turmas/${u.classId}/ucs/${u.classUnitId}`}
                className="group flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className="text-xl">🎯</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium group-hover:text-primary">{u.uc}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {u.turma} · aulas e exercícios →
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Meu desempenho por UC */}
      <Card className="reveal-up reveal-delay-5">
        <CardHeader
          title="📊 Meu desempenho"
          description="Como você vai em cada unidade curricular. Clique para ver o detalhe."
        />
        {dash.desempenho.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
            <span className="text-2xl opacity-50">📭</span>
            Ainda não há notas ou frequência lançadas. Elas aparecem aqui assim que seu professor avaliar.
          </div>
        ) : (
          <>
            {/* Resumo em chips com contagem grande */}
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ResumoChip emoji="✅" valor={dash.resumo.aprovado} label="aprovada(s)" tone="text-success" bg="from-success/10" />
              <ResumoChip emoji="⚠️" valor={dash.resumo.recuperacao} label="recuperação" tone="text-warning" bg="from-warning/10" />
              <ResumoChip emoji="❌" valor={dash.resumo.reprovado} label="reprovada(s)" tone="text-danger" bg="from-danger/10" />
              <ResumoChip
                emoji="📅"
                valor={dash.resumo.freqMedia != null ? `${dash.resumo.freqMedia}%` : "—"}
                label="freq. média"
                tone="text-foreground"
                bg="from-muted/40"
              />
            </div>

            {/* Uma linha por UC, com barra de média colorida pela situação */}
            <div className="flex flex-col gap-2">
              {dash.desempenho.map((d, i) => {
                const meta = sitMeta(d.situacao);
                const mediaPct = d.media != null ? Math.min(100, Math.max(0, d.media * 10)) : 0;
                const inner = (
                  <div className="group flex flex-col gap-2 rounded-xl border border-border bg-background/40 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-0 sm:w-48">
                      <div className="truncate text-sm font-medium group-hover:text-primary">{d.uc}</div>
                      <div className="truncate text-xs text-muted-foreground">{d.turma}</div>
                    </div>
                    {/* Barra de média */}
                    <div className="flex flex-1 items-center gap-3">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`xp-grow h-full rounded-full ${meta.bar}`}
                          style={{ ["--xp-target" as string]: `${mediaPct}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-sm font-bold tabular-nums">
                        {d.media != null ? d.media.toFixed(1) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${d.freqBaixa ? "font-medium text-danger" : "text-muted-foreground"}`}>
                        {d.freqPct != null ? `${d.freqPct}% freq.` : "—"}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.chip}`}>
                        {meta.emoji} {SIT_LABEL[d.situacao] ?? d.situacao}
                      </span>
                    </div>
                  </div>
                );
                return d.classId ? (
                  <Link key={`${d.uc}-${i}`} href={`/turmas/${d.classId}/minhas-notas`}>
                    {inner}
                  </Link>
                ) : (
                  <div key={`${d.uc}-${i}`}>{inner}</div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Próximas entregas + atalhos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingDeadlines items={deadlines} />
        <Card className="reveal-up">
          <CardHeader title="🚀 Continue praticando" description="Vá direto ao que dá XP." />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Atalho href="/exercicios" emoji="💻" label="Exercícios" />
            <Atalho href="/duelos" emoji="⚔️" label="Duelos" />
            <Atalho href="/ranking" emoji="🏆" label="Ranking" />
            <Atalho href="/turmas" emoji="🎓" label="Turmas" />
            <Atalho href="/perfil" emoji="🪙" label="Perfil e loja" />
          </div>
        </Card>
      </div>
    </div>
  );
}

/** Atalho em tile com emoji grande — entrada de game UI. */
function Atalho({ href, emoji, label }: { href: string; emoji: string; label: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-background/40 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <span className="text-2xl transition-transform group-hover:scale-110">{emoji}</span>
      <span className="text-xs font-medium group-hover:text-primary">{label}</span>
    </Link>
  );
}
