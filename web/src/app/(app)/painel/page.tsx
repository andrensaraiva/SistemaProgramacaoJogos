import { getProfile } from "@/lib/auth/dal";

export default async function PainelPage() {
  const profile = await getProfile();
  const isProf = profile?.role === "professor" || profile?.role === "admin";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">
          Olá, {profile?.display_name ?? "aluno"}! 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isProf
            ? "Bem-vindo de volta. Acompanhe suas turmas e crie novos exercícios."
            : "Bora resolver alguns exercícios? Você está no nível " +
              profile?.level +
              "."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="XP total" value={`${profile?.xp ?? 0}`} hint="pontos de experiência" />
        <Card title="Nível" value={`${profile?.level ?? 1}`} hint="continue resolvendo pra subir" />
        <Card
          title="Conquistas"
          value="0"
          hint="resolva seu primeiro exercício pra desbloquear"
        />
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <h2 className="text-lg font-semibold">Em breve por aqui</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {isProf
            ? "Painel do professor: criar turmas, listas de exercícios, e acompanhar o progresso da galera. Está sendo construído."
            : "Lista de exercícios atribuídos pela sua turma, ranking e duelos. Está sendo construído."}
        </p>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
