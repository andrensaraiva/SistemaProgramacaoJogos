import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function UnityPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Unity e GitHub Classroom</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Frente para atividades fora do navegador: C# com xUnit e projetos Unity
            com GameCI. Os templates ficam versionados no repositorio.
          </p>
        </div>
        <Link href="/unity/github">
          <Button>Ver notas GitHub</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TemplateCard
          title="C# basico"
          path="classroom-templates/csharp-basico"
          description="Template .NET com xUnit para desafios de logica e testes automaticos."
        />
        <TemplateCard
          title="Unity projeto"
          path="classroom-templates/unity-projeto"
          description="Estrutura inicial para testes EditMode/PlayMode com GameCI."
        />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Fluxo recomendado</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Professor cria uma assignment no GitHub Classroom usando um template.</li>
          <li>Aluno aceita o convite e envia commits no repositorio gerado.</li>
          <li>GitHub Actions roda os testes automaticamente.</li>
          <li>Professor consulta o resultado no GitHub enquanto a integracao por API evolui.</li>
        </ol>
      </section>
    </div>
  );
}

function TemplateCard({
  title,
  path,
  description,
}: {
  title: string;
  path: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <code className="mt-3 block rounded-md bg-muted px-3 py-2 text-xs">
        {path}
      </code>
    </div>
  );
}
