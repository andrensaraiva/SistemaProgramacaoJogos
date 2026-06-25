import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/states";
import { getProfile } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

import { cancelDuel, finishDuel } from "./actions";
import { DuelForms } from "./_forms";

type DuelRow = {
  id: string;
  exercise_id: string;
  challenger_id: string;
  opponent_id: string | null;
  winner_id: string | null;
  status: string;
  invite_code: string;
  started_at: string | null;
  challenger_rating_before: number | null;
  challenger_rating_after: number | null;
  opponent_rating_before: number | null;
  opponent_rating_after: number | null;
  rating_delta: number | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string;
  duel_rating: number | null;
  duel_wins: number | null;
  duel_losses: number | null;
};
type ExerciseRow = { id: string; title: string };

const STATUS_LABEL: Record<string, string> = {
  aguardando: "Aguardando",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export default async function DuelosPage() {
  const profile = await getProfile();
  if (!profile) {
    return <div>Perfil nao encontrado.</div>;
  }

  const admin = createAdminClient();
  const { data: exercises } = await admin
    .from("exercises")
    .select("id, title")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: duels } = await admin
    .from("duels")
    .select(
      "id, exercise_id, challenger_id, opponent_id, winner_id, status, invite_code, started_at, challenger_rating_before, challenger_rating_after, opponent_rating_before, opponent_rating_after, rating_delta, created_at",
    )
    .or(`challenger_id.eq.${profile.id},opponent_id.eq.${profile.id}`)
    .order("created_at", { ascending: false });

  const rows = (duels ?? []) as DuelRow[];
  const profileIds = [
    ...new Set(
      rows.flatMap((duel) =>
        [duel.challenger_id, duel.opponent_id, duel.winner_id].filter(Boolean),
      ) as string[],
    ),
  ];
  const exerciseIds = [...new Set(rows.map((duel) => duel.exercise_id))];

  const { data: duelProfiles } =
    profileIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, display_name, duel_rating, duel_wins, duel_losses")
          .in("id", profileIds)
      : { data: [] };
  const { data: duelExercises } =
    exerciseIds.length > 0
      ? await admin.from("exercises").select("id, title").in("id", exerciseIds)
      : { data: [] };

  const names = new Map(
    ((duelProfiles ?? []) as ProfileRow[]).map((item) => [
      item.id,
      item.display_name,
    ]),
  );
  const ratings = new Map(
    ((duelProfiles ?? []) as ProfileRow[]).map((item) => [
      item.id,
      item.duel_rating ?? 1000,
    ]),
  );
  const currentPlayer = ((duelProfiles ?? []) as ProfileRow[]).find(
    (item) => item.id === profile.id,
  );
  const exerciseTitles = new Map(
    ((duelExercises ?? []) as ExerciseRow[]).map((item) => [
      item.id,
      item.title,
    ]),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Duelos X1"
        description="Crie um desafio, compartilhe o código e vença sendo o primeiro a aprovar o exercício."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Meu ELO"
          value={currentPlayer?.duel_rating ?? profile.duel_rating ?? 1000}
          tone="primary"
        />
        <StatCard
          title="Vitórias"
          value={currentPlayer?.duel_wins ?? profile.duel_wins ?? 0}
          tone="success"
        />
        <StatCard
          title="Derrotas"
          value={currentPlayer?.duel_losses ?? profile.duel_losses ?? 0}
        />
      </section>

      <DuelForms exercises={(exercises ?? []) as ExerciseRow[]} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Meus duelos</h2>
        {rows.length === 0 && (
          <EmptyState
            title="Nenhum duelo ainda"
            description="Crie um desafio acima e compartilhe o código com um colega."
            icon="⚔️"
          />
        )}
        {rows.map((duel) => (
          <Card key={duel.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-semibold">
                  {exerciseTitles.get(duel.exercise_id) ?? "Exercício"}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {names.get(duel.challenger_id) ?? "Desafiante"} vs{" "}
                  {duel.opponent_id
                    ? names.get(duel.opponent_id) ?? "Oponente"
                    : "aguardando oponente"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  ELO: {ratings.get(duel.challenger_id) ?? 1000} vs{" "}
                  {duel.opponent_id
                    ? ratings.get(duel.opponent_id) ?? 1000
                    : "?"}
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
                  {duel.rating_delta && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                      ELO +{duel.rating_delta} / -{duel.rating_delta}
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
          </Card>
        ))}
      </section>
    </div>
  );
}
