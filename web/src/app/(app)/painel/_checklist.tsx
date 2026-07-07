import { Card, CardHeader } from "@/components/ui/card";
import { marcarChecklist } from "@/lib/teacher/checklist";
import type { TurmaChecklist } from "@/lib/teacher/checklist";

// Checklist diário do professor POR TURMA: para cada turma com aula hoje, marca
// chamada + plano de aula. Cobre quem dá aula de manhã e de tarde.
export function ChecklistDiario({ turmas }: { turmas: TurmaChecklist[] }) {
  if (turmas.length === 0) return null; // sem aula hoje: não mostra o card

  const pendentes = turmas.filter((t) => !t.presencaFeita || !t.planoRegistrado).length;
  const tudoFeito = pendentes === 0;

  return (
    <Card tone={tudoFeito ? undefined : "warning"}>
      <CardHeader
        title="Rotina de hoje"
        description={
          turmas.length === 1
            ? "Você tem aula hoje. Já registrou a chamada e o plano?"
            : `${turmas.length} turmas com aula hoje. Registre a rotina de cada uma.`
        }
        action={
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              tudoFeito ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
            }`}
          >
            {tudoFeito ? "tudo em dia" : `${pendentes} pendente${pendentes > 1 ? "s" : ""}`}
          </span>
        }
      />
      <div className="flex flex-col gap-3">
        {turmas.map((t) => (
          <div key={t.classId} className="rounded-xl border border-border bg-background/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              {t.turma}
              {t.uc && <span className="text-xs font-normal text-muted-foreground">· {t.uc}</span>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <ChecklistItem classId={t.classId} campo="presenca" label="Fiz a chamada" checked={t.presencaFeita} />
              <ChecklistItem classId={t.classId} campo="plano" label="Registrei o plano de aula" checked={t.planoRegistrado} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ChecklistItem({
  classId,
  campo,
  label,
  checked,
}: {
  classId: string;
  campo: "presenca" | "plano";
  label: string;
  checked: boolean;
}) {
  return (
    <form action={marcarChecklist}>
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="campo" value={campo} />
      <input type="hidden" name="valor" value={(!checked).toString()} />
      <button
        type="submit"
        className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left text-sm transition-colors ${
          checked
            ? "border-success/40 bg-success/5"
            : "border-border bg-card hover:border-primary/40"
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
        <span className={checked ? "text-muted-foreground line-through" : ""}>{label}</span>
      </button>
    </form>
  );
}
