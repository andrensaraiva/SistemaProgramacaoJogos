import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { requireCapability } from "@/lib/auth/guard";
import { listarAdmins, listarAlunos, listarCoordenadores } from "@/lib/admin/actions";
import { getAdminStats } from "@/lib/admin/stats";
import { createClient } from "@/lib/supabase/server";

import {
  AdminRowItem,
  AlunoRow,
  BuscaAlunos,
  CoordenadorRowItem,
  CursoManualForm,
  NovaContaForm,
  PedidoResetItem,
  ProfessorRow,
} from "./_client";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profile = await requireCapability("gerenciar_contas");

  const { q } = await searchParams;
  const supabase = await createClient();
  const isMaster = profile.is_master === true;

  const [stats, professores, pedidos, alunos, admins] = await Promise.all([
    getAdminStats(),
    supabase
      .from("profiles")
      .select("id, display_name, institutional_email, personal_email, profile_completed, disabled_at")
      .eq("role", "professor")
      .order("display_name")
      .then((r) => r.data ?? []),
    supabase
      .from("password_reset_requests")
      .select(
        "id, requester_role, created_at, requester:profiles!requester_id(display_name, institutional_email, personal_email)",
      )
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .then((r) => r.data ?? []),
    listarAlunos(q ?? ""),
    isMaster ? listarAdmins() : Promise.resolve([]),
  ]);
  const coordenadores = await listarCoordenadores();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Painel do administrador"
        description="Visão da instituição e gestão de contas e cursos."
      />

      {/* Dashboard institucional */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Professores" value={stats.professores} hint={stats.professoresSuspensos ? `${stats.professoresSuspensos} suspenso(s)` : "ativos"} tone="primary" />
        <StatCard title="Alunos" value={stats.alunos} hint={stats.alunosSuspensos ? `${stats.alunosSuspensos} suspenso(s)` : "ativos"} />
        <StatCard title="Turmas" value={stats.turmas} />
        <StatCard title="Cursos" value={stats.cursos} />
        <StatCard title="Aguardando 1º acesso" value={stats.aguardandoPrimeiroAcesso} tone={stats.aguardandoPrimeiroAcesso ? "warning" : "default"} hint="contas criadas, ainda não acessadas" />
        <StatCard title="Pedidos de reset" value={stats.resetsPendentes} tone={stats.resetsPendentes ? "warning" : "default"} hint="pendentes de aprovação" />
      </div>

      {/* Criar conta + pedidos de reset */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Nova conta"
            description="Crie um professor ou outro administrador. A senha temporária é trocada no primeiro acesso."
          />
          <NovaContaForm isMaster={isMaster} />
        </Card>

        <Card>
          <CardHeader
            title="Pedidos de redefinição de senha"
            description="Aprovar gera uma senha temporária para você repassar."
          />
          {pedidos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido pendente.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {pedidos.map((p) => {
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

      {/* Cursos */}
      <Card>
        <CardHeader
          title="Cursos"
          description={`${stats.cursos} curso(s). Crie manualmente, importe por IA ou gerencie a lista.`}
          action={
            <div className="flex gap-2">
              <Link href="/cursos/importar">
                <Button variant="secondary">Importar PPC (IA)</Button>
              </Link>
              <Link href="/cursos">
                <Button variant="secondary">Ver cursos</Button>
              </Link>
            </div>
          }
        />
        <CursoManualForm />
      </Card>

      {/* Professores */}
      <Card>
        <CardHeader title="Professores" description={`${professores.length} cadastrado(s).`} />
        {professores.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum professor ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {professores.map((prof) => (
              <ProfessorRow
                key={prof.id}
                id={prof.id}
                nome={prof.display_name}
                institutionalEmail={prof.institutional_email}
                personalEmail={prof.personal_email}
                profileCompleted={prof.profile_completed}
                disabled={!!prof.disabled_at}
              />
            ))}
          </ul>
        )}
      </Card>

      {/* Coordenadores */}
      <Card>
        <CardHeader
          title="Coordenadores"
          description={`${coordenadores.length} cadastrado(s). Supervisionam qualquer turma.`}
        />
        {coordenadores.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum coordenador ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {coordenadores.map((c) => (
              <CoordenadorRowItem
                key={c.id}
                id={c.id}
                nome={c.display_name}
                email={c.institutional_email ?? c.personal_email ?? "—"}
                disabled={!!c.disabled_at}
              />
            ))}
          </ul>
        )}
      </Card>

      {/* Administradores (só o master gerencia) */}
      {isMaster && (
        <Card>
          <CardHeader
            title="Administradores"
            description="Como master, você gerencia os administradores: promover/rebaixar e suspender."
          />
          <ul className="divide-y divide-border">
            {admins.map((a) => (
              <AdminRowItem
                key={a.id}
                id={a.id}
                nome={a.display_name}
                email={a.institutional_email ?? "—"}
                isMaster={a.is_master}
                disabled={!!a.disabled_at}
                souEu={a.id === profile.id}
              />
            ))}
          </ul>
        </Card>
      )}

      {/* Alunos */}
      <Card>
        <CardHeader
          title="Alunos"
          description="Busque por nome ou e-mail para resetar senha ou suspender."
          action={<BuscaAlunos defaultValue={q ?? ""} />}
        />
        {alunos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {q ? "Nenhum aluno encontrado." : "Nenhum aluno cadastrado."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {alunos.map((a) => (
              <AlunoRow
                key={a.id}
                id={a.id}
                nome={a.display_name}
                email={a.institutional_email ?? a.personal_email ?? "—"}
                profileCompleted={a.profile_completed}
                disabled={!!a.disabled_at}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
