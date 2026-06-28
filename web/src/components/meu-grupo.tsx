import { AvatarWithFrame } from "@/components/avatar-with-frame";
import type { MeuGrupo } from "@/lib/groups/queries";

// Painel "Meu grupo" mostrado em atividades em grupo: nome do grupo + colegas.
// Deixa claro pro aluno que a entrega é compartilhada com o time.
export function MeuGrupoPanel({
  grupo,
  meuId,
}: {
  grupo: MeuGrupo | null;
  meuId: string;
}) {
  if (!grupo) {
    return (
      <div className="rounded-xl border border-dashed border-warning/40 bg-warning/5 p-4 text-sm text-muted-foreground">
        👥 Esta é uma atividade <span className="font-medium text-foreground">em grupo</span>, mas
        você ainda não está em um grupo desta turma. Peça ao professor para te incluir.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">👥 Meu grupo: {grupo.name}</span>
        <span className="text-xs text-muted-foreground">
          {grupo.members.length} integrante{grupo.members.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {grupo.members.map((m) => (
          <span
            key={m.id}
            className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${
              m.id === meuId ? "border-primary/40 bg-primary/10 font-medium text-primary" : "border-border bg-background/50"
            }`}
          >
            <AvatarWithFrame name={m.display_name} size={20} />
            {m.display_name}
            {m.id === meuId && " (você)"}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        A entrega desta atividade vale para todo o grupo — qualquer integrante pode enviar.
      </p>
    </div>
  );
}
