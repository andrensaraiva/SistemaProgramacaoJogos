"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  adicionarProfessor,
  definirResponsavelUc,
  removerProfessor,
  type CoDocenciaState,
} from "@/lib/turmas/co-docencia";
import { enviarFeedback, type FeedbackState } from "@/lib/feedback/actions";

const selCls =
  "rounded-lg border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

export function AddProfessorForm({
  classId,
  professores,
}: {
  classId: string;
  professores: { id: string; display_name: string }[];
}) {
  const [state, action, pending] = useActionState<CoDocenciaState, FormData>(adicionarProfessor, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="class_id" value={classId} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Adicionar professor</span>
        <select name="teacher_id" className={selCls} required defaultValue="">
          <option value="" disabled>
            Escolha um professor…
          </option>
          {professores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Adicionando..." : "Adicionar"}
      </Button>
      {state && (
        <span className={`text-xs ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</span>
      )}
    </form>
  );
}

export function RemoveProfessorButton({ classId, teacherId }: { classId: string; teacherId: string }) {
  return (
    <form action={removerProfessor}>
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="teacher_id" value={teacherId} />
      <Button type="submit" variant="ghost" className="px-2 py-1 text-xs text-danger">
        remover
      </Button>
    </form>
  );
}

export function ResponsavelUcForm({
  classId,
  classUnitId,
  ucTitle,
  professores,
  atual,
}: {
  classId: string;
  classUnitId: string;
  ucTitle: string;
  professores: { id: string; display_name: string; isOwner: boolean }[];
  atual: string;
}) {
  const [state, action, pending] = useActionState<CoDocenciaState, FormData>(definirResponsavelUc, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="class_unit_id" value={classUnitId} />
      <span className="min-w-32 flex-1 font-medium">{ucTitle}</span>
      <select name="teacher_id" defaultValue={atual} className={selCls}>
        <option value="">Dono (padrão)</option>
        {professores.map((p) => (
          <option key={p.id} value={p.id}>
            {p.display_name}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary" disabled={pending} className="px-2 py-1 text-xs">
        {pending ? "..." : "Salvar"}
      </Button>
      {state && !state.ok && <span className="text-xs text-danger">{state.message}</span>}
      {state?.ok && <span className="text-xs text-success">✓</span>}
    </form>
  );
}

// -----------------------------------------------------------------------------
// Feedback anônimo do aluno
// -----------------------------------------------------------------------------

export function FeedbackForm({
  classId,
  professores,
  ucList,
}: {
  classId: string;
  professores: { id: string; display_name: string }[];
  ucList: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(enviarFeedback, undefined);
  const [rating, setRating] = useState(5);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="rating" value={rating} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Professor</span>
        <select name="teacher_id" className={selCls} required defaultValue="">
          <option value="" disabled>
            Escolha um professor…
          </option>
          {professores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Sobre (opcional)</span>
        <select name="class_unit_id" className={selCls} defaultValue="">
          <option value="">Geral (todas as aulas)</option>
          {ucList.map((uc) => (
            <option key={uc.id} value={uc.id}>
              {uc.title}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-1">
        <span className="mr-2 text-sm text-muted-foreground">Nota:</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} estrelas`}
            className={`text-2xl ${n <= rating ? "text-warning" : "text-muted-foreground/40"}`}
          >
            ★
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Comentário (opcional)</span>
        <textarea
          name="comment"
          rows={3}
          maxLength={2000}
          placeholder="O que está indo bem? O que poderia melhorar?"
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </label>

      {state && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            state.ok ? "border-success/40 bg-success/10 text-success" : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {state.message}
        </div>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando..." : "Enviar avaliação anônima"}
        </Button>
      </div>
    </form>
  );
}
