import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getProfile } from "@/lib/auth/dal";
import { getAcessoTurma } from "@/lib/turmas/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { CriarEntrarDuelo } from "./_lobby";

type Params = Promise<{ id: string; classUnitId: string }>;

const STATUS_LABEL: Record<string, string> = {
  aguardando: "Aguardando oponente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export default async function DuelosQuizPage({ params }: { params: Params }) {
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

  const { data: membership } = await supabase
    .from("class_members")
    .select("student_id")
    .eq("class_id", id)
    .eq("student_id", profile.id)
    .maybeSingle();
  const isOwner = (await getAcessoTurma(id, profile, cls.owner_id)).podeGerenciar;
  if (!membership && !isOwner) redirect(`/turmas/${id}`);

  const admin = createAdminClient();

  // Tamanho do banco (pra avisar se dá pra criar duelo).
  const { count: bankCount } = await admin
    .from("quiz_questions")
    .select("id", { count: "exact", head: true })
    .or(`is_public.eq.true,author_id.eq.${cls.owner_id}`);

  // Meus duelos nesta UC (ou todos, se professor dono).
  const base = admin
    .from("quiz_duels")
    .select(
      "id, challenger_id, opponent_id, winner_id, status, invite_code, question_count, challenger_correct, opponent_correct, created_at",
    )
    .eq("class_unit_id", classUnitId)
    .order("created_at", { ascending: false });
  const { data: duels } = isOwner
    ? await base
    : await base.or(`challenger_id.eq.${profile.id},opponent_id.eq.${profile.id}`);

  // Quem já respondeu (para mostrar "Responder" vs "Aguardando").
  const duelIds = (duels ?? []).map((d) => d.id);
  const { data: finishes } = duelIds.length
    ? await admin.from("quiz_duel_finishes").select("duel_id, player_id").in("duel_id", duelIds)
    : { data: [] as { duel_id: string; player_id: string }[] };
  const finishedSet = new Set((finishes ?? []).map((f) => `${f.duel_id}:${f.player_id}`));

  // Nomes dos participantes.
  const ids = [
    ...new Set(
      (duels ?? []).flatMap((d) =>
        [d.challenger_id, d.opponent_id, d.winner_id].filter(Boolean),
      ) as string[],
    ),
  ];
  const { data: people } = ids.length
    ? await admin.from("profiles").select("id, display_name").in("id", ids)
    : { data: [] };
  const names = new Map((people ?? []).map((p) => [p.id, p.display_name]));

  // Ranking contextual (compartilhado com duelos de código).
  const { data: ratings } = await admin
    .from("duel_ratings")
    .select("student_id, rating, wins, losses")
    .eq("class_unit_id", classUnitId)
    .order("rating", { ascending: false })
    .limit(10);
  const rankIds = (ratings ?? []).map((r) => r.student_id);
  const { data: rankPeople } = rankIds.length
    ? await admin.from("profiles").select("id, display_name").in("id", rankIds)
    : { data: [] };
  const rankNames = new Map((rankPeople ?? []).map((p) => [p.id, p.display_name]));

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Turmas", href: "/turmas" },
          { label: cls.name, href: `/turmas/${id}` },
          { label: "Unidades curriculares", href: `/turmas/${id}/ucs` },
          { label: uc?.title ?? "UC" },
          { label: "Duelo de quiz" },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Duelo de quiz · {uc?.title ?? "UC"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            X1 de questões SAEP. Vence quem acerta mais (desempate por tempo). O ELO
            conta no ranking da UC.
          </p>
        </div>
        <Link href={`/turmas/${id}/ucs/${classUnitId}/duelos`}>
          <Button variant="ghost">Duelos de código →</Button>
        </Link>
      </div>

      {membership && (
        <CriarEntrarDuelo
          classId={id}
          classUnitId={classUnitId}
          bankCount={bankCount ?? 0}
        />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          {isOwner ? "Duelos da turma" : "Meus duelos"}
        </h2>
        {(duels ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum duelo de quiz ainda.
          </div>
        )}
        {(duels ?? []).map((d) => {
          const iAmPlayer =
            d.challenger_id === profile.id || d.opponent_id === profile.id;
          const iFinished = finishedSet.has(`${d.id}:${profile.id}`);
          const canAnswer =
            iAmPlayer && d.status === "em_andamento" && !iFinished;
          return (
            <div key={d.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">
                    {names.get(d.challenger_id) ?? "Desafiante"} vs{" "}
                    {d.opponent_id
                      ? names.get(d.opponent_id) ?? "Oponente"
                      : "aguardando"}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      {STATUS_LABEL[d.status] ?? d.status}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5">
                      {d.question_count} questões
                    </span>
                    {d.status === "aguardando" && (
                      <span className="rounded-full bg-muted px-2 py-0.5 font-mono">
                        {d.invite_code}
                      </span>
                    )}
                    {d.status === "concluido" && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                        {d.challenger_correct ?? 0} × {d.opponent_correct ?? 0}
                      </span>
                    )}
                    {d.winner_id && (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">
                        Vencedor: {names.get(d.winner_id) ?? "aluno"}
                      </span>
                    )}
                    {d.status === "concluido" && !d.winner_id && (
                      <span className="rounded-full bg-muted px-2 py-0.5">Empate</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canAnswer && (
                    <Link href={`/turmas/${id}/ucs/${classUnitId}/duelos-quiz/${d.id}`}>
                      <Button>Responder</Button>
                    </Link>
                  )}
                  {iAmPlayer && d.status === "em_andamento" && iFinished && (
                    <span className="self-center text-xs text-muted-foreground">
                      Você respondeu · aguardando o outro
                    </span>
                  )}
                  {d.status === "concluido" && iAmPlayer && (
                    <Link href={`/turmas/${id}/ucs/${classUnitId}/duelos-quiz/${d.id}`}>
                      <Button variant="secondary">Ver resultado</Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {(ratings ?? []).length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Ranking da UC (duelos)</h2>
          <Table>
            <THead>
              <TH className="w-12 text-center">#</TH>
              <TH>Aluno</TH>
              <TH className="text-center">ELO</TH>
              <TH className="text-center">V/D</TH>
            </THead>
            <TBody>
              {(ratings ?? []).map((r, i) => (
                <TR key={r.student_id}>
                  <TD className="text-center text-lg font-semibold">
                    {["🥇", "🥈", "🥉"][i] ?? <span className="text-sm text-muted-foreground">{i + 1}</span>}
                  </TD>
                  <TD className="font-medium">{rankNames.get(r.student_id) ?? "Aluno"}</TD>
                  <TD className="text-center tnum font-semibold">{r.rating}</TD>
                  <TD className="text-center tnum text-muted-foreground">
                    {r.wins}/{r.losses}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </section>
      )}
    </div>
  );
}
