import Link from "next/link";

import { LoginForm } from "./_form";

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string; suspenso?: string }>;
}) {
  const { proximo, suspenso } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Entrar na Celeste Academy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plataforma de turmas e provas. Use seu e-mail (institucional ou
          pessoal) e sua senha. No primeiro acesso, você define uma nova senha.
        </p>
      </div>
      {suspenso && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          Esta conta está suspensa. Procure o administrador.
        </div>
      )}
      <LoginForm proximo={proximo ?? "/painel"} />
      <p className="text-center text-sm text-muted-foreground">
        Esqueceu a senha?{" "}
        <Link
          href="/esqueci-senha"
          className="font-medium text-primary hover:underline"
        >
          Solicitar redefinição
        </Link>
      </p>
      <p className="text-center text-xs text-muted-foreground">
        Não tem conta? Alunos são cadastrados pelo professor; professores, pelo
        administrador.
      </p>
    </div>
  );
}
