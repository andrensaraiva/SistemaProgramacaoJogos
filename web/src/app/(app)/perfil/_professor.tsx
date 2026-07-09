import Link from "next/link";

import { AvatarWithFrame } from "@/components/avatar-with-frame";
import { Constellation } from "@/components/constellation";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import type { FeedbackSummary } from "@/lib/feedback/aggregate";

// Perfil do PROFESSOR — identidade profissional + impacto de ensino + reputação.
// Tom calmo/premium (Aurora Minimal claro), sem gamificação de aluno.

const sv = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICON = {
  turma: sv("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"),
  alunos: sv("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"),
  exercicios: sv("m16 18 6-6-6-6M8 6l-6 6 6 6"),
  estrela: sv("M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"),
};

function estrelas(n: number): string {
  const r = Math.round(n);
  return "★".repeat(r) + "☆".repeat(5 - r);
}

export function PerfilProfessor({
  nome,
  emailInstitucional,
  emailPessoal,
  frameId,
  skinId,
  turmasCount,
  alunosCount,
  exerciciosCount,
  feedback,
  turmas,
}: {
  nome: string;
  emailInstitucional: string | null;
  emailPessoal: string | null;
  frameId?: string | null;
  skinId?: string | null;
  turmasCount: number;
  alunosCount: number;
  exerciciosCount: number;
  feedback: FeedbackSummary;
  turmas: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-col gap-8">
      {/* Cabeçalho — identidade */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <Constellation className="absolute right-4 top-3 h-20 w-40 text-primary/15" />
        <div className="relative flex flex-wrap items-center gap-5">
          <AvatarWithFrame name={nome} frameId={frameId} skinId={skinId} size={72} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{nome}</h1>
              <span className="rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-semibold text-primary">
                Professor
              </span>
            </div>
            <div className="mt-1.5 flex flex-col gap-0.5 text-sm text-muted-foreground">
              {emailInstitucional && <span>✉️ {emailInstitucional}</span>}
              {emailPessoal && <span className="text-xs">pessoal: {emailPessoal}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Impacto de ensino */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Turmas" value={turmasCount} tone="primary" icon={ICON.turma} />
        <StatCard title="Alunos" value={alunosCount} icon={ICON.alunos} />
        <StatCard title="Exercícios criados" value={exerciciosCount} icon={ICON.exercicios} />
        <StatCard
          title="Avaliação dos alunos"
          value={feedback.average != null ? feedback.average.toFixed(1) : "—"}
          tone={feedback.average != null && feedback.average >= 4 ? "success" : "default"}
          hint={feedback.total > 0 ? `${feedback.total} avaliação(ões)` : "sem avaliações ainda"}
          icon={ICON.estrela}
        />
      </div>

      {/* Minhas turmas */}
      <Card>
        <CardHeader title="Minhas turmas" description="As turmas que você leciona." />
        {turmas.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
            <span className="text-xl">🎓</span> Você ainda não tem turmas.{" "}
            <Link href="/turmas/nova" className="font-medium text-primary hover:underline">
              Criar turma
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {turmas.map((t) => (
              <Link
                key={t.id}
                href={`/turmas/${t.id}`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-e2"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                  {ICON.turma}
                </span>
                <span className="min-w-0 truncate text-sm font-medium group-hover:text-primary">
                  {t.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Reputação — feedback anônimo dos alunos */}
      <Card>
        <CardHeader
          title="O que os alunos dizem"
          description="Feedback anônimo — você não vê quem enviou. Mais recentes primeiro."
        />
        {feedback.total === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há feedback dos alunos.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-lg text-warning">{estrelas(feedback.average ?? 0)}</span>
              <span className="font-medium">
                {feedback.average != null ? feedback.average.toFixed(1) : "—"} / 5
              </span>
              <span className="text-muted-foreground">{feedback.total} avaliação(ões)</span>
            </div>
            {feedback.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem comentários escritos por enquanto.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {feedback.comments.slice(0, 5).map((c, i) => (
                  <li key={i} className="rounded-lg border border-border bg-background/40 p-3 text-sm">
                    <span className="text-warning">{estrelas(c.rating)}</span>
                    {c.sessionId && <span className="ml-2 text-xs text-muted-foreground">sobre uma aula</span>}
                    <p className="mt-1 text-foreground">{c.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
