import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/dal";
import { getAcessoTurma } from "@/lib/turmas/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { cancelDuel, finishDuel } from "@/app/(app)/duelos/actions";
import { NovoDueloForm } from "./_form";

type Params = Promise<{ id: string; classUnitId: string }>;

const STATUS_LABEL: Record<string, string> = {
  aguardando: "Aguardando",
  em_andamento: "Em andamento",
  concluido: "Concluido",
  cancelado: "Cancelado",
};

export default async function DuelosUcPage({ params }: { params: Params }) {
  const { id, classUnitId } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/entrar");

  const supabase = await createClient();
  const { data: cu } = await supabase
    .from("class_units")
    .select(
      "id, class_id, class:classes!class_id(id, name, owner_id), uc:curricular_units!uc_id(id, title)",
    )
    .eq("id", classUnitId)
    .single();
  if (!cu || cu.class_id !== id) notFound();

  const cls = cu.class as unknown as { id: string; name: string; owner_id: string };
  const uc = cu.uc as unknown as { id: string; title: string } | null;

  // O aluno precisa ser membro da turma (ou o dono) para ver os duelos da UC.
  const { data: membership } = await supabase
    .from("class_members")
    .select("student_id")
    .eq("class_id", id)
    .eq("student_id", profile.id)
    .maybeSingle();
  const isOwner = (await getAcessoTurma(id, profile, cls.owner_id)).podeGerenciar;
  if (!membership && !isOwner) redirect(`/turmas/${id}`);

  const admin = createAdminClient();

  // Exercícios de código disponíveis para o duelo (públicos ou do professor da turma).
  const { data: exercises } = await admin
    .from("exercises")
    .select("id, title")
    .or(`is_public.eq.true,author_id.eq.${cls.owner_id}`)
    .eq("exercise_type", "codigo")
    .order("created_at", { ascending: false })
    .limit(30);

  // Ranking contextual desta UC.
  const { data: ratings } = await admin
    .from("duel_ratings")
    .select("student_id, rating, wins, losses")
    .eq("class_unit_id", classUnitId)
    .order("rating", { ascending: false });

  // Duelos desta UC em que o usuário participa.
  const { data: duels } = await admin
    .from("duels")
    .select(
      "id, exercise_id, challenger_id, opponent_id, winner_id, status, invite_code, rating_delta, created_at",
    )
    .eq("class_unit_id", classUnitId)
    .or(`challenger_id.eq.${profile.id},opponent_id.eq.${profile.id}`)
    .order("created_at", { ascending: false });

  // Nomes e títulos para exibição.
  const ids = [
    ...new Set([
      ...(ratings ?? []).map((r) => r.student_id),
      ...(duels ?? []).flatMap((d) =>
        [d.challenger_id, d.opponent_id, d.winner_id].filter(Boolean),
      ),
    ] as string[]),
  ];
  const { data: people } = ids.length
    ? await admin.from("profiles").select("id, display_name").in("id", ids)
    : { data: [] };
  const names = new Map((people ?? []).map((p) => [p.id, p.display_name]));
  const exIds = [...new Set((duels ?? []).map((d) => d.exercise_id))];
  const { data: exTitles } = exIds.length
    ? await admin.from("exercises").select("id, title").in("id", exIds)
    : { data: [] };
  const titles = new Map((exTitles ?? []).map((e) => [e.id, e.title]));

  const myRating = (ratings ?? []).find((r) => r.student_id === profile.id);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Turmas", href: "/turmas" },
          { label: cls.name, href: `/turmas/${id}` },
          { label: "Unidades curriculares", href: `/turmas/${id}/ucs` },
          { label: uc?.title ?? "UC" },
          { label: "Duelos" },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Duelos de código · {uc?.title ?? "UC"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ELO e ranking contam apenas dentro desta unidade curricular.
          </p>
        </div>
        <Link href={`/turmas/${id}/ucs/${classUnitId}/duelos-quiz`}>
          <Button variant="secondary">Duelo de quiz (SAEP) →</Button>
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Meu ELO (nesta UC)" value={String(myRating?.rating ?? 1000)} />
        <Stat label="Vitórias" value={String(myRating?.wins ?? 0)} />
        <Stat label="Derrotas" value={String(myRating?.losses ?? 0)} />
      </section>

      {membership && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-lg font-semibold">Novo duelo</h2>
          {exercises?.length ? (
            <NovoDueloForm
              classId={id}
              classUnitId={classUnitId}
              exercises={exercises}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum exercício de código disponível para duelo ainda.
            </p>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Meus duelos nesta UC</h2>
        {(duels ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum duelo ainda.
          </div>
        )}
        {(duels ?? []).map((duel) => (
          <div key={duel.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-semibold">
                  {titles.get(duel.exercise_id) ?? "Exercício"}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {names.get(duel.challenger_id) ?? "Desafiante"} vs{" "}
                  {duel.opponent_id
                    ? names.get(duel.opponent_id) ?? "Oponente"
                    : "aguardando oponente"}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {STATUS_LABEL[duel.status] ?? duel.status}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 font-mono">
                    {duel.invite_code}
                  </span>
                  {duel.winner_id && (
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">
                      Vencedor: {names.get(duel.winner_id) ?? "aluno"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/exercicios/${duel.exercise_id}`}>
                  <Button variant="secondary">Abrir exercício</Button>
                </Link>
                {duel.status === "em_andamento" && (
                  <form action={finishDuel}>
                    <input type="hidden" name="duel_id" value={duel.id} />
                    <Button type="submit">Atualizar vencedor</Button>
                  </form>
                )}
                {duel.status === "aguardando" &&
                  duel.challenger_id === profile.id && (
                    <form action={cancelDuel}>
                      <input type="hidden" name="duel_id" value={duel.id} />
                      <Button type="submit" variant="danger">
                        Cancelar
                      </Button>
                    </form>
                  )}
              </div>
            </div>
          </div>
        ))}
      </section>

      {(ratings ?? []).length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Ranking da UC</h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2 text-left font-medium">#</th>
                  <th className="px-4 py-2 text-left font-medium">Aluno</th>
                  <th className="px-4 py-2 text-center font-medium">ELO</th>
                  <th className="px-4 py-2 text-center font-medium">V/D</th>
                </tr>
              </thead>
              <tbody>
                {(ratings ?? []).map((r, i) => (
                  <tr
                    key={r.student_id}
                    className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
                  >
                    <td className="px-4 py-2 font-semibold">{i + 1}</td>
                    <td className="px-4 py-2">
                      {names.get(r.student_id) ?? "Aluno"}
                    </td>
                    <td className="px-4 py-2 text-center font-semibold">
                      {r.rating}
                    </td>
                    <td className="px-4 py-2 text-center text-muted-foreground">
                      {r.wins}/{r.losses}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
