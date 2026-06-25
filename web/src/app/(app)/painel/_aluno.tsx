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

const SIT_LABEL: Record<string, string> = {
  reprovado: "Reprovado",
  recuperacao: "Recuperação",
  aprovado: "Aprovado",
};

function prazoRelativo(iso: string | null): string {
  if (!iso) return "";
  const dias = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "amanhã";
  return `em ${dias} dias`;
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
        <CardHeader title="📌 A entregar" description="Atividades com prazo que você ainda não enviou." />
        {dash.pendencias.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tudo em dia! 🎉</p>
        ) : (
          <ul className="divide-y divide-border">
            {dash.pendencias.slice(0, 8).map((p) => (
              <li key={p.assignmentId}>
                <Link
                  href={`/turmas/${p.classId}/listas/${p.assignmentId}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{p.titulo}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.turma}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{prazoRelativo(p.dueAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Minhas UCs — rever conteúdo e refazer exercícios */}
      {dash.ucs.length > 0 && (
        <Card>
          <CardHeader
            title="Minhas unidades curriculares"
            description="Reveja as aulas e refaça os exercícios de cada UC."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dash.ucs.map((u) => (
              <Link
                key={u.classUnitId}
                href={`/turmas/${u.classId}/ucs/${u.classUnitId}`}
                className="rounded-xl border border-border bg-background/40 p-3 transition-colors hover:border-primary/40"
              >
                <span className="text-sm font-medium">{u.uc}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{u.turma} · aulas e exercícios →</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Meu desempenho por UC */}
      <Card>
        <CardHeader
          title="Meu desempenho"
          description="Como você vai em cada unidade curricular. Clique para ver o detalhe."
        />
        {dash.desempenho.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há notas ou frequência lançadas.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">
                {dash.resumo.aprovado} aprovado(s)
              </span>
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-warning">
                {dash.resumo.recuperacao} recuperação
              </span>
              <span className="rounded-full bg-danger/15 px-2 py-0.5 text-danger">
                {dash.resumo.reprovado} reprovado(s)
              </span>
              {dash.resumo.freqMedia != null && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  Frequência média {dash.resumo.freqMedia}%
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1">UC</th>
                    <th>Turma</th>
                    <th className="text-center">Média</th>
                    <th className="text-center">Freq.</th>
                    <th className="text-center">Situação</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {dash.desempenho.map((d, i) => (
                    <tr key={`${d.uc}-${i}`} className="border-t border-border">
                      <td className="py-1.5">{d.uc}</td>
                      <td>{d.turma}</td>
                      <td className="text-center">{d.media != null ? d.media.toFixed(1) : "—"}</td>
                      <td className={`text-center ${d.freqBaixa ? "text-danger font-medium" : ""}`}>
                        {d.freqPct != null ? `${d.freqPct}%` : "—"}
                      </td>
                      <td className="text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            d.situacao === "reprovado"
                              ? "bg-danger/15 text-danger"
                              : d.situacao === "recuperacao"
                                ? "bg-warning/15 text-warning"
                                : "bg-success/15 text-success"
                          }`}
                        >
                          {SIT_LABEL[d.situacao] ?? d.situacao}
                        </span>
                      </td>
                      <td className="text-right">
                        {d.classId && (
                          <Link
                            href={`/turmas/${d.classId}/minhas-notas`}
                            className="text-xs text-primary hover:underline"
                          >
                            detalhes
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Próximas entregas + atalhos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingDeadlines items={deadlines} />
        <Card>
          <CardHeader title="Atalhos" description="Continue praticando." />
          <div className="flex flex-wrap gap-2">
            <Link href="/exercicios">
              <Button variant="secondary">Exercícios</Button>
            </Link>
            <Link href="/duelos">
              <Button variant="secondary">Duelos</Button>
            </Link>
            <Link href="/ranking">
              <Button variant="secondary">Ranking</Button>
            </Link>
            <Link href="/turmas">
              <Button variant="secondary">Minhas turmas</Button>
            </Link>
            <Link href="/perfil">
              <Button variant="secondary">Perfil e loja</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
