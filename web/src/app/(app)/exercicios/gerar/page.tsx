import { redirect } from "next/navigation";

import { getProfile } from "@/lib/auth/dal";

import { GenerateExerciseForm } from "./_form";

export default async function GerarExercicioPage() {
  const profile = await getProfile();
  const isProfessor = profile?.role === "professor" || profile?.role === "admin";

  if (!isProfessor) redirect("/exercicios");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Gerar exercicio com IA</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Descreva o tema e a habilidade que quer praticar. A IA cria enunciado,
          codigo inicial, solucao interna e testes visiveis/ocultos em C#.
        </p>
      </div>

      <GenerateExerciseForm />
    </div>
  );
}
