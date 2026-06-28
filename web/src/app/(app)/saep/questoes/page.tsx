import Link from "next/link";

import { ConfirmForm } from "@/components/confirm-form";
import { Badge, DIFFICULTY_LABEL, DIFFICULTY_TONE } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { requireCapability } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { excluirQuestao } from "@/lib/saep/actions";

// Banco de questões SAEP do instrutor (suas + públicas). Entrada manual fácil.
export default async function QuestoesPage() {
  const profile = await requireCapability("gerenciar_curso");

  const admin = createAdminClient();
  const { data: questions } = await admin
    .from("quiz_questions")
    .select(
      "id, comando, difficulty, is_public, created_at, competency:competencies!competency_id(code), knowledge_object:knowledge_objects!knowledge_object_id(code)",
    )
    .eq("author_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Banco de questões (SAEP)"
        description="Questões teóricas no formato Contexto + Comando + alternativas. Use no simulado de uma UC."
        actions={
          <Link href="/saep/questoes/nova">
            <Button>+ Nova questão</Button>
          </Link>
        }
      />

      {!questions?.length ? (
        <EmptyState
          title="Nenhuma questão ainda"
          description="Crie sua primeira questão manualmente ou peça uma sugestão à IA."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {questions.map((q) => {
            const comp = q.competency as unknown as { code: string } | null;
            const obj = q.knowledge_object as unknown as { code: string } | null;
            return (
              <div
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{q.comando}</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge tone={DIFFICULTY_TONE[q.difficulty] ?? "neutral"}>
                      {DIFFICULTY_LABEL[q.difficulty] ?? q.difficulty}
                    </Badge>
                    {comp?.code && <Badge tone="primary">{comp.code}</Badge>}
                    {obj?.code && <Badge tone="accent">Obj {obj.code}</Badge>}
                    {q.is_public && <Badge tone="success">Pública</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/saep/questoes/${q.id}`}>
                    <Button variant="secondary">Editar</Button>
                  </Link>
                  <ConfirmForm action={excluirQuestao} message="Excluir esta questão?">
                    <input type="hidden" name="id" value={q.id} />
                    <Button type="submit" variant="ghost">
                      ✕
                    </Button>
                  </ConfirmForm>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
