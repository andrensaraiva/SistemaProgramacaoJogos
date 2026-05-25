import { getProfile } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

type RankingProfile = {
  id: string;
  display_name: string;
  xp: number;
  level: number;
};

export default async function RankingPage() {
  const profile = await getProfile();
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name, xp, level")
    .eq("role", "aluno")
    .order("xp", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(50);

  const rows = (profiles ?? []) as RankingProfile[];
  const userIds = rows.map((row) => row.id);

  const { data: badges } =
    userIds.length > 0
      ? await admin.from("user_badges").select("user_id").in("user_id", userIds)
      : { data: [] };

  const badgeCount = new Map<string, number>();
  for (const badge of badges ?? []) {
    badgeCount.set(badge.user_id, (badgeCount.get(badge.user_id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Ranking global</h1>
        <p className="text-sm text-muted-foreground">
          Alunos ordenados por XP acumulado em exercicios aprovados.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-16 px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Aluno</th>
              <th className="px-4 py-3 text-right font-medium">Nivel</th>
              <th className="px-4 py-3 text-right font-medium">XP</th>
              <th className="px-4 py-3 text-right font-medium">Badges</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isMe = row.id === profile?.id;
              return (
                <tr
                  key={row.id}
                  className={`border-b border-border/60 last:border-0 ${
                    isMe ? "bg-primary/10" : "bg-card"
                  }`}
                >
                  <td className="px-4 py-3 font-semibold">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {row.display_name}
                      {isMe && (
                        <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                          voce
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{row.level}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {row.xp}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {badgeCount.get(row.id) ?? 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Nenhum aluno no ranking ainda.
        </div>
      )}
    </div>
  );
}
