"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  criarSessao,
  marcarPresenca,
  type AttendanceStatus,
} from "@/lib/attendance/actions";

type Student = { id: string; name: string };
type Session = {
  id: string;
  number: number;
  date: string | null;
  label: string | null;
};
type Mark = {
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
};

// Ciclo ao clicar: vazio → presente → atraso → falta → presente...
const NEXT: Record<"none" | AttendanceStatus, AttendanceStatus> = {
  none: "presente",
  presente: "atraso",
  atraso: "falta",
  falta: "presente",
};

const STYLE: Record<"none" | AttendanceStatus, string> = {
  none: "bg-background text-muted-foreground hover:bg-muted",
  presente: "bg-green-500/20 text-green-700 dark:text-green-300",
  atraso: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  falta: "bg-danger/20 text-danger",
};

const LABEL: Record<"none" | AttendanceStatus, string> = {
  none: "·",
  presente: "P",
  atraso: "A",
  falta: "F",
};

export function FrequenciaGrid({
  classUnitId,
  students,
  sessions,
  marks,
}: {
  classUnitId: string;
  students: Student[];
  sessions: Session[];
  marks: Mark[];
}) {
  const router = useRouter();
  const [creating, startCreate] = useTransition();
  const [, startMark] = useTransition();

  // Estado local das marcas: chave `${sessionId}:${studentId}`.
  const [state, setState] = useState<Record<string, AttendanceStatus>>(() => {
    const m: Record<string, AttendanceStatus> = {};
    for (const k of marks) m[`${k.sessionId}:${k.studentId}`] = k.status;
    return m;
  });

  function cellStatus(
    sessionId: string,
    studentId: string,
  ): "none" | AttendanceStatus {
    return state[`${sessionId}:${studentId}`] ?? "none";
  }

  function toggle(sessionId: string, studentId: string) {
    const current = cellStatus(sessionId, studentId);
    const next = NEXT[current];
    setState((s) => ({ ...s, [`${sessionId}:${studentId}`]: next }));
    startMark(async () => {
      const res = await marcarPresenca(sessionId, studentId, next);
      if (!res.ok) {
        // Reverte em caso de erro.
        setState((s) => {
          const copy = { ...s };
          const key = `${sessionId}:${studentId}`;
          if (current === "none") delete copy[key];
          else copy[key] = current;
          return copy;
        });
        alert(res.message);
      }
    });
  }

  function novaAula(formData: FormData) {
    startCreate(async () => {
      const res = await criarSessao(classUnitId, formData);
      if (!res.ok) alert(res.message);
      else router.refresh();
    });
  }

  // Resumo por aluno (faltas/atrasos).
  function resumo(studentId: string) {
    let faltas = 0;
    let atrasos = 0;
    for (const sess of sessions) {
      const st = cellStatus(sess.id, studentId);
      if (st === "falta") faltas++;
      if (st === "atraso") atrasos++;
    }
    return { faltas, atrasos };
  }

  if (!students.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta turma ainda não tem alunos. Compartilhe o código de convite na
        página da turma.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        action={novaAula}
        className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Data da aula</span>
          <input
            type="date"
            name="date"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Rótulo (opcional)</span>
          <input
            name="label"
            placeholder="Ex: Aula 13 — Sprites"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </label>
        <Button type="submit" disabled={creating}>
          {creating ? "Criando..." : "+ Nova aula"}
        </Button>
      </form>

      {!sessions.length ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma aula criada ainda. Adicione a primeira aula acima.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-semibold">
                  Aluno
                </th>
                {sessions.map((s) => (
                  <th
                    key={s.id}
                    className="px-2 py-2 text-center font-medium"
                    title={s.label ?? undefined}
                  >
                    <div>{s.number}</div>
                    {s.date && (
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {new Date(s.date).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </div>
                    )}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-medium">F / A</th>
              </tr>
            </thead>
            <tbody>
              {students.map((st) => {
                const r = resumo(st.id);
                return (
                  <tr key={st.id} className="border-t border-border">
                    <td className="sticky left-0 z-10 bg-card px-3 py-1.5 font-medium">
                      {st.name}
                    </td>
                    {sessions.map((s) => {
                      const status = cellStatus(s.id, st.id);
                      return (
                        <td key={s.id} className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => toggle(s.id, st.id)}
                            className={`h-8 w-8 rounded text-xs font-semibold transition-colors ${STYLE[status]}`}
                            title={status === "none" ? "Marcar" : status}
                          >
                            {LABEL[status]}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-3 py-1.5 text-center text-xs text-muted-foreground">
                      {r.faltas} / {r.atrasos}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-green-600">P</span> Presente
        </span>
        <span>
          <span className="font-semibold text-amber-600">A</span> Atraso
        </span>
        <span>
          <span className="font-semibold text-danger">F</span> Falta
        </span>
      </div>
    </div>
  );
}
