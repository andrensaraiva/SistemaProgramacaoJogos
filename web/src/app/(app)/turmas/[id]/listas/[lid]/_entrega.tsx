"use client";

import { useActionState, useState } from "react";

import { RewardToast, type Reward } from "@/components/reward-toast";
import { Button } from "@/components/ui/button";
import { entregarTrabalho, type EntregaState } from "@/lib/submissions/actions";

const inputCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

type Props = {
  classId: string;
  assignmentId: string;
  exerciseId: string;
  tipo: "apresentacao" | "modelo_resposta";
  responseTemplate?: string | null;
  // valores já entregues
  currentLink?: string | null;
  currentResponse?: string | null;
};

// Formulário de entrega não-código: link (apresentação) ou texto (modelo).
export function EntregaForm({
  classId,
  assignmentId,
  exerciseId,
  tipo,
  responseTemplate,
  currentLink,
  currentResponse,
}: Props) {
  const boundAction = entregarTrabalho.bind(null, classId);
  const [state, action, pending] = useActionState<EntregaState, FormData>(
    boundAction,
    undefined,
  );
  // Recompensa derivada do resultado da action (sem espelhar em outro state).
  // `dismissed` guarda o objeto de state já fechado pelo usuário.
  const [dismissed, setDismissed] = useState<EntregaState>(undefined);
  const reward: Reward | null =
    state?.ok && state.xpEarned && state.xpEarned > 0 && state !== dismissed
      ? { xp: state.xpEarned, badges: [] }
      : null;

  return (
    <form action={action} className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      <RewardToast reward={reward} onClose={() => setDismissed(state)} />
      <input type="hidden" name="exercise_id" value={exerciseId} />
      <input type="hidden" name="assignment_id" value={assignmentId} />

      {tipo === "apresentacao" ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Link da entrega (slides, Drive...)</span>
          <input
            name="link"
            type="url"
            defaultValue={currentLink ?? ""}
            placeholder="https://..."
            className={inputCls}
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Sua resposta</span>
          {responseTemplate && (
            <span className="mb-1 whitespace-pre-line rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
              {responseTemplate}
            </span>
          )}
          <textarea
            name="resposta"
            rows={5}
            defaultValue={currentResponse ?? ""}
            placeholder="Escreva aqui..."
            className={`${inputCls} resize-y`}
          />
        </label>
      )}

      {state && (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            state.ok
              ? "border border-success/40 bg-success/10 text-success"
              : "border border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {state.message}
          {state.ok && state.xpEarned ? ` +${state.xpEarned} XP` : ""}
        </div>
      )}

      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending
            ? "Enviando..."
            : currentLink || currentResponse
              ? "Atualizar entrega"
              : "Enviar entrega"}
        </Button>
      </div>
    </form>
  );
}
