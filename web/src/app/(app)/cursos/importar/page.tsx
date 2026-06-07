import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { requireCapability } from "@/lib/auth/guard";

import { ImportarPpcForm } from "./_form";

export default async function ImportarPpcPage() {
  await requireCapability("gerenciar_curso");

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Cursos", href: "/cursos" },
          { label: "Importar PPC" },
        ]}
      />
      <div>
        <h1 className="text-3xl font-bold">Importar PPC com IA</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Cole o texto do PPC (Plano Pedagógico de Curso). A IA extrai apenas a{" "}
          <strong>formação técnica</strong> — módulos, unidades curriculares,
          habilidades, conhecimentos e bibliografia — e ignora a formação geral
          básica do ensino médio. Você revisa tudo antes de salvar.
        </p>
      </div>

      <ImportarPpcForm />

      <p className="text-xs text-muted-foreground">
        Dica: abra o PDF, selecione o texto da parte técnica (Ctrl+A no PDF ou
        copie módulo a módulo) e cole aqui.{" "}
        <Link href="/cursos" className="underline">
          Voltar aos cursos
        </Link>
      </p>
    </div>
  );
}
