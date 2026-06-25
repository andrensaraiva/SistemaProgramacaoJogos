import { AvatarWithFrame } from "@/components/avatar-with-frame";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getProfile } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

type RankingProfile = {
  id: string;
  display_name: string;
  xp: number;
  level: number;
  avatar_frame_id: string | null;
  avatar_skin_id: string | null;
};

// Medalha para o pódio; demais posições mostram o número.
const MEDAL = ["🥇", "🥈", "🥉"];

export default async function RankingPage() {
  const profile = await getProfile();
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name, xp, level, avatar_frame_id, avatar_skin_id")
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
      <PageHeader
        title="Ranking global"
        description="Alunos ordenados por XP acumulado em exercícios aprovados."
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Ranking vazio"
          description="Nenhum aluno pontuou ainda. Resolva exercícios para aparecer aqui."
          icon="🏆"
        />
      ) : (
        <Table>
          <THead>
            <TH className="w-16 text-center">#</TH>
            <TH>Aluno</TH>
            <TH className="text-right">Nível</TH>
            <TH className="text-right">XP</TH>
            <TH className="text-right">Badges</TH>
          </THead>
          <TBody>
            {rows.map((row, index) => {
              const isMe = row.id === profile?.id;
              return (
                <TR key={row.id} className={isMe ? "bg-primary/10" : ""}>
                  <TD className="text-center text-lg font-semibold">
                    {MEDAL[index] ?? <span className="text-base text-muted-foreground">{index + 1}</span>}
                  </TD>
                  <TD>
                    <div className="flex items-center gap-3">
                      <AvatarWithFrame
                        name={row.display_name}
                        frameId={row.avatar_frame_id}
                        skinId={row.avatar_skin_id}
                        size={32}
                      />
                      <span className="font-medium">{row.display_name}</span>
                      {isMe && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                          você
                        </span>
                      )}
                    </div>
                  </TD>
                  <TD className="text-right">{row.level}</TD>
                  <TD className="text-right font-semibold">{row.xp}</TD>
                  <TD className="text-right">{badgeCount.get(row.id) ?? 0}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </div>
  );
}
