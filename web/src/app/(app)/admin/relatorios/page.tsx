import Link from "next/link";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { requireCapability } from "@/lib/auth/guard";
import { getInstitutionalReport } from "@/lib/reports/institutional";

const CARDS = [
  {
    href: "/admin/relatorios/institucional",
    title: "Institucional",
    desc: "Panorama geral: totais, situação dos alunos e frequência média.",
  },
  {
    href: "/admin/relatorios/professores",
    title: "Professores",
    desc: "Quem lança frequência, tem plano, executa o plano e cria atividades.",
  },
  {
    href: "/admin/relatorios/turmas",
    title: "Turmas",
    desc: "Consolidado por turma e por UC (aprovação, recuperação, reprovação).",
  },
  {
    href: "/admin/relatorios/alunos",
    title: "Alunos",
    desc: "Alunos em risco: reprovados, em recuperação ou faltando muito.",
  },
  {
    href: "/admin/relatorios/saep",
    title: "SAEP / SAP",
    desc: "Desempenho teórico + prático por competência, com detalhe por turma e UC.",
  },
  {
    href: "/admin/relatorios/projetos",
    title: "Projetos Integradores",
    desc: "Progresso dos grupos no board (tarefas concluídas) e grupos parados.",
  },
  {
    href: "/admin/relatorios/feedback",
    title: "Feedback dos alunos",
    desc: "Avaliações anônimas dos professores, por professor (todas as turmas) e por turma.",
  },
];

export default async function RelatoriosHub() {
  await requireCapability("ver_relatorios");

  const inst = await getInstitutionalReport();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Relatórios"
        description="Acompanhe a instituição e exporte relatórios em CSV ou PDF."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Aprovados" value={inst.situacao.aprovado} tone="success" hint="matrículas aluno×UC" />
        <StatCard title="Recuperação" value={inst.situacao.recuperacao} tone="warning" />
        <StatCard title="Reprovados" value={inst.situacao.reprovado} tone="danger" />
        <StatCard title="Frequência média" value={inst.freqMediaGlobalPct != null ? `${inst.freqMediaGlobalPct}%` : "—"} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className="h-full transition-colors hover:border-primary/50">
              <h2 className="font-semibold">{c.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
