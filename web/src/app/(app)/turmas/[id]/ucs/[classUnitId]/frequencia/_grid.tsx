"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  criarAulasDoDia,
  marcarPresenca,
  type AttendanceStatus,
} from "@/lib/attendance/actions";

type Student = { id: string; name: string };
type Session = {
  id: string;
  number: number;
  period: number;
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
  presente: "bg-success/20 text-success",
  atraso: "bg-warning/20 text-warning",
  falta: "bg-danger/20 text-danger",
};

const LABEL: Record<"none" | AttendanceStatus, string> = {
  none: "·",
  presente: "P",
  atraso: "A",
  falta: "F",
};

function formatDay(date: string | null) {
  if (!date) return "Sem data";
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

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

  // Agrupa as aulas por dia (data) preservando a ordem. Cada grupo tem suas
  // aulas ordenadas por período (1ª, 2ª...). Aulas sem data caem num grupo só.
  const dias = useMemo(() => {
    const ordered = [...sessions].sort(
      (a, b) => a.number - b.number || a.period - b.period,
    );
    const groups: { key: string; date: string | null; aulas: Session[] }[] = [];
    for (const s of ordered) {
      const key = s.date ?? "sem-data";
      let g = groups.find((x) => x.key === key);
      if (!g) {
        g = { key, date: s.date, aulas: [] };
        groups.push(g);
      }
      g.aulas.push(s);
    }
    for (const g of groups) g.aulas.sort((a, b) => a.period - b.period);
    return groups;
  }, [sessions]);

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

  function novoDia(formData: FormData) {
    startCreate(async () => {
      const res = await criarAulasDoDia(classUnitId, formData);
      if (!res.ok) alert(res.message);
      else router.refresh();
    });
  }

  // Resumo por aluno (faltas/atrasos no total de aulas).
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
        action={novoDia}
        className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Data do dia</span>
          <input
            type="date"
            name="date"
            required
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Aulas neste dia</span>
          <input
            type="number"
            name="quantidade"
            defaultValue={4}
            min={1}
            max={12}
            className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Rótulo (opcional)</span>
          <input
            name="label"
            placeholder="Ex: Sprites e animação"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </label>
        <Button type="submit" disabled={creating}>
          {creating ? "Criando..." : "+ Adicionar dia"}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        Cada dia pode ter várias aulas/tempos. Marque a presença em cada aula —
        o aluno pode faltar só a 1ª e a 2ª, ou a 1ª e a última, por exemplo.
      </p>

      {!sessions.length ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma aula criada ainda. Adicione o primeiro dia acima.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              {/* Linha 1: os dias (agrupando as aulas) */}
              <tr className="bg-muted/50">
                <th
                  rowSpan={2}
                  className="sticky left-0 z-10 border-r border-border bg-muted/50 px-3 py-2 text-left align-bottom font-semibold"
                >
                  Aluno
                </th>
                {dias.map((d) => (
                  <th
                    key={d.key}
                    colSpan={d.aulas.length}
                    className="border-l border-border px-2 py-1.5 text-center font-semibold"
                  >
                    {formatDay(d.date)}
                  </th>
                ))}
                <th rowSpan={2} className="px-3 py-2 text-center align-bottom font-medium">
                  F / A
                </th>
              </tr>
              {/* Linha 2: as aulas (períodos) de cada dia */}
              <tr className="bg-muted/30">
                {dias.flatMap((d) =>
                  d.aulas.map((s, i) => (
                    <th
                      key={s.id}
                      className={`px-2 py-1 text-center text-xs font-medium text-muted-foreground ${
                        i === 0 ? "border-l border-border" : ""
                      }`}
                      title={s.label ?? undefined}
                    >
                      {s.period}ª
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {students.map((st) => {
                const r = resumo(st.id);
                return (
                  <tr key={st.id} className="border-t border-border">
                    <td className="sticky left-0 z-10 border-r border-border bg-card px-3 py-1.5 font-medium">
                      {st.name}
                    </td>
                    {dias.flatMap((d) =>
                      d.aulas.map((s, i) => {
                        const status = cellStatus(s.id, st.id);
                        return (
                          <td
                            key={s.id}
                            className={`p-1 text-center ${
                              i === 0 ? "border-l border-border" : ""
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggle(s.id, st.id)}
                              className={`h-8 w-8 rounded text-xs font-semibold transition-colors ${STYLE[status]}`}
                              title={
                                status === "none"
                                  ? `Marcar ${s.period}ª aula`
                                  : `${s.period}ª aula: ${status}`
                              }
                            >
                              {LABEL[status]}
                            </button>
                          </td>
                        );
                      }),
                    )}
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
          <span className="font-semibold text-success">P</span> Presente
        </span>
        <span>
          <span className="font-semibold text-warning">A</span> Atraso
        </span>
        <span>
          <span className="font-semibold text-danger">F</span> Falta
        </span>
      </div>
    </div>
  );
}
