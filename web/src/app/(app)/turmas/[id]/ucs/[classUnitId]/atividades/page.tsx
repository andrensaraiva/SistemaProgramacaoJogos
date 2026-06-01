import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { NovaAtividadeForm } from "./_form";

type Params = Promise<{ id: string; classUnitId: string }>;

const KIND_LABEL: Record<string, string> = {
  lista: "Lista",
  desafio: "Desafio",
  prova: "Prova",
  duelo: "Duelo",
  unity: "Unity",
  projeto_integrador: "Projeto integrador",
};

const KIND_TONE: Record<
  string,
  "neutral" | "primary" | "accent" | "success" | "warning" | "danger"
> = {
  lista: "neutral",
  desafio: "warning",
  prova: "danger",
  duelo: "primary",
  unity: "accent",
  projeto_integrador: "success",
};

export default async function AtividadesUcPage({ params }: { params: Params }) {
  const { id, classUnitId } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const supabase = await createClient();

  // Carrega o class_unit com turma e UC para cabeçalho e checagem de posse.
  const { data: cu } = await supabase
    .from("class_units")
    .select(
      "id, class_id, class:classes!class_id(id, name, owner_id), uc:curricular_units!uc_id(id, title), plan:teaching_plans!teaching_plan_id(id, title)",
    )
    .eq("id", classUnitId)
    .single();
  if (!cu || cu.class_id !== id) notFound();

  const cls = cu.class as unknown as {
    id: string;
    name: string;
    owner_id: string;
  };
  const uc = cu.uc as unknown as { id: string; title: string } | null;
  const plan = cu.plan as unknown as { id: string; title: string } | null;
  const isOwner = cls.owner_id === profile.id;

  // Atividades desta UC (RLS já filtra: dono vê todas, aluno vê as da sua turma).
  const { data: atividades } = await supabase
    .from("assignments")
    .select("id, title, kind, due_at, created_at")
    .eq("class_unit_id", classUnitId)
    .order("created_at", { ascending: false });

  // Blocos do plano de ensino (para atrelar a atividade a uma faixa de aulas).
  const blocks = plan
    ? (
        await supabase
          .from("teaching_plan_blocks")
          .select("id, title, ord")
          .eq("plan_id", plan.id)
          .order("ord")
      ).data ?? []
    : [];

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Turmas", href: "/turmas" },
          { label: cls.name, href: `/turmas/${id}` },
          { label: "Unidades curriculares", href: `/turmas/${id}/ucs` },
          { label: uc?.title ?? "UC" },
          { label: "Atividades" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold">{uc?.title ?? "Atividades"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turma {cls.name}. Atividades (listas, provas, duelos, Unity, projeto
          integrador) desta unidade curricular.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        {atividades?.length ? (
          atividades.map((a) => (
            <Link
              key={a.id}
              href={`/turmas/${id}/listas/${a.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40"
            >
              <div>
                <div className="font-semibold">{a.title}</div>
                {a.due_at && (
                  <div className="text-xs text-muted-foreground">
                    Prazo:{" "}
                    {new Date(a.due_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </div>
                )}
              </div>
              <Badge tone={KIND_TONE[a.kind] ?? "neutral"}>
                {KIND_LABEL[a.kind] ?? a.kind}
              </Badge>
            </Link>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma atividade nesta UC ainda.
          </p>
        )}
      </section>

      {isOwner && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-lg font-semibold">Nova atividade</h2>
          <NovaAtividadeForm
            classId={id}
            classUnitId={classUnitId}
            blocks={blocks.map((b) => ({ id: b.id, title: b.title }))}
          />
        </section>
      )}

      <div>
        <Link href={`/turmas/${id}/ucs`}>
          <Button variant="ghost">← Voltar para UCs</Button>
        </Link>
      </div>
    </div>
  );
}
