import { Card, CardHeader } from "@/components/ui/card";
import { marcarChecklist } from "@/lib/teacher/checklist";
import type { ChecklistDia } from "@/lib/teacher/checklist";

// Checklist diário do professor: lembrete de chamada + plano de aula. Marcação
// manual (a plataforma externa não é acessível). Some visualmente quando tudo
// está feito, mas continua disponível.
export function ChecklistDiario({
  checklist,
  temAulaHoje,
}: {
  checklist: ChecklistDia;
  temAulaHoje: boolean;
}) {
  const tudoFeito = checklist.presencaFeita && checklist.planoRegistrado;

  return (
    <Card className={tudoFeito ? "" : "border-warning/40 bg-warning/5"}>
      <CardHeader
        title="✅ Rotina de hoje"
        description={
          temAulaHoje
            ? "Você tem aula hoje. Já registrou tudo?"
            : "Confirme o que já fez hoje."
        }
        action={
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              tudoFeito ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
            }`}
          >
            {tudoFeito ? "tudo em dia" : "pendente"}
          </span>
        }
      />
      <div className="flex flex-col gap-2">
        <ChecklistItem
          campo="presenca"
          label="Fiz a chamada (presença dos alunos)"
          checked={checklist.presencaFeita}
        />
        <ChecklistItem
          campo="plano"
          label="Registrei o plano de aula (plataforma SENAI)"
          checked={checklist.planoRegistrado}
        />
      </div>
    </Card>
  );
}

function ChecklistItem({
  campo,
  label,
  checked,
}: {
  campo: "presenca" | "plano";
  label: string;
  checked: boolean;
}) {
  return (
    <form action={marcarChecklist}>
      <input type="hidden" name="campo" value={campo} />
      {/* Ao clicar, alterna o valor. */}
      <input type="hidden" name="valor" value={(!checked).toString()} />
      <button
        type="submit"
        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors ${
          checked
            ? "border-success/40 bg-success/5 text-foreground"
            : "border-border bg-background/40 hover:border-primary/40"
        }`}
      >
        <span
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border text-xs ${
            checked ? "border-success bg-success text-white" : "border-border"
          }`}
          aria-hidden="true"
        >
          {checked ? "✓" : ""}
        </span>
        <span className={checked ? "line-through opacity-70" : ""}>{label}</span>
      </button>
    </form>
  );
}
