import { redirect } from "next/navigation";

import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { NovoProfessorForm, PedidoResetItem } from "./_client";

export default async function AdminPage() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  if (profile.role !== "admin") {
    return (
      <EmptyState
        title="Acesso restrito"
        description="Esta área é exclusiva de administradores."
      />
    );
  }

  const supabase = await createClient();

  const { data: professores } = await supabase
    .from("profiles")
    .select("id, display_name, institutional_email, personal_email, profile_completed")
    .eq("role", "professor")
    .order("display_name");

  const { data: pedidos } = await supabase
    .from("password_reset_requests")
    .select(
      "id, requester_role, created_at, requester:profiles!requester_id(display_name, institutional_email, personal_email)",
    )
    .eq("status", "pendente")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Administração"
        description="Cadastre professores e resolva pedidos de redefinição de senha."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Novo professor"
            description="Cria a conta com uma senha temporária; o professor troca no primeiro acesso."
          />
          <NovoProfessorForm />
        </Card>

        <Card>
          <CardHeader
            title="Pedidos de redefinição de senha"
            description="Aprovar gera uma senha temporária para você repassar."
          />
          {(pedidos ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido pendente.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {(pedidos ?? []).map((p) => {
                const r = p.requester as unknown as {
                  display_name: string;
                  institutional_email: string | null;
                  personal_email: string | null;
                } | null;
                return (
                  <PedidoResetItem
                    key={p.id}
                    id={p.id}
                    nome={r?.display_name ?? "Usuário"}
                    email={r?.institutional_email ?? r?.personal_email ?? ""}
                    papel={p.requester_role}
                  />
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Professores" description={`${professores?.length ?? 0} cadastrado(s).`} />
        {(professores ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum professor ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(professores ?? []).map((prof) => (
              <li key={prof.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-medium">{prof.display_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {prof.institutional_email ?? prof.personal_email ?? "—"}
                    {!prof.profile_completed && " · aguardando primeiro acesso"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
