import { redirect } from "next/navigation";

import { DesempenhoLista } from "@/components/desempenho-uc";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getProfile } from "@/lib/auth/dal";
import { getStudentDashboard } from "@/lib/dashboard/student";

// Meu desempenho — visão agregada (notas + frequência por UC de todas as turmas).
// O detalhe por turma continua em /turmas/[id]/minhas-notas e /minha-frequencia.
export default async function MeuDesempenhoPage() {
  const profile = await getProfile();
  if (!profile) redirect("/entrar");
  // Área do aluno; gestão tem painéis próprios.
  if (profile.role !== "aluno") redirect("/sem-acesso");

  const dash = await getStudentDashboard({ id: profile.id, xp: profile.xp ?? 0 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="📊 Meu desempenho"
        description="Como você vai em cada unidade curricular, somando todas as suas turmas."
      />

      <Card className="reveal-up">
        <CardHeader
          title="Por unidade curricular"
          description="Clique em uma UC para ver as notas e a frequência detalhadas."
        />
        <DesempenhoLista desempenho={dash.desempenho} resumo={dash.resumo} />
      </Card>
    </div>
  );
}
