"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { salvarRubrica } from "@/lib/sap/actions";

// Editor da lista de verificação (rubrica): Unidade → Elemento → Critério → Item.
// Estado em memória; salva a árvore inteira de uma vez.

export type Competency = { id: string; code: string; description: string };
export type KObject = { id: string; code: string; name: string };

type Item = {
  code: string;
  description: string;
  points: number;
  competency_id: string;
  knowledge_object_id: string;
};
type Criterion = { code: string; description: string; items: Item[] };
type Element = { code: string; title: string; criteria: Criterion[] };
type Unit = { code: string; title: string; elements: Element[] };

type InitialUnit = {
  code: string | null;
  title: string;
  elements: {
    code: string | null;
    title: string;
    criteria: {
      code: string | null;
      description: string;
      items: {
        code: string | null;
        description: string;
        points: number;
        competency_id: string | null;
        knowledge_object_id: string | null;
      }[];
    }[];
  }[];
};

function fromInitial(units: InitialUnit[]): Unit[] {
  return units.map((u) => ({
    code: u.code ?? "",
    title: u.title,
    elements: u.elements.map((e) => ({
      code: e.code ?? "",
      title: e.title,
      criteria: e.criteria.map((c) => ({
        code: c.code ?? "",
        description: c.description,
        items: c.items.map((it) => ({
          code: it.code ?? "",
          description: it.description,
          points: it.points,
          competency_id: it.competency_id ?? "",
          knowledge_object_id: it.knowledge_object_id ?? "",
        })),
      })),
    })),
  }));
}

const inputCls =
  "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

export function RubricEditor({
  assessmentId,
  initial,
  competencies,
  knowledgeObjects,
}: {
  assessmentId: string;
  initial: InitialUnit[];
  competencies: Competency[];
  knowledgeObjects: KObject[];
}) {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>(fromInitial(initial));
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  // Helpers de mutação imutável por caminho de índices.
  function update(fn: (draft: Unit[]) => void) {
    setUnits((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await salvarRubrica(
        assessmentId,
        units.map((u) => ({
          code: u.code,
          title: u.title,
          elements: u.elements.map((e) => ({
            code: e.code,
            title: e.title,
            criteria: e.criteria.map((c) => ({
              code: c.code,
              description: c.description,
              items: c.items.map((it) => ({
                code: it.code,
                description: it.description,
                points: Number(it.points) || 0,
                competency_id: it.competency_id || undefined,
                knowledge_object_id: it.knowledge_object_id || undefined,
              })),
            })),
          })),
        })),
      );
      if (!res.ok) {
        setMsg(res.message);
        return;
      }
      setMsg("Rubrica salva.");
      router.refresh();
    });
  }

  const totalPoints = units.reduce(
    (s, u) =>
      s +
      u.elements.reduce(
        (se, e) =>
          se + e.criteria.reduce((sc, c) => sc + c.items.reduce((si, it) => si + (Number(it.points) || 0), 0), 0),
        0,
      ),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lista de verificação</h2>
        <span className="text-xs text-muted-foreground">Total: {totalPoints} pts</span>
      </div>

      {units.map((u, ui) => (
        <div key={ui} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <input
              value={u.code}
              onChange={(e) => update((d) => void (d[ui].code = e.target.value))}
              placeholder="Cód."
              className={`${inputCls} w-16`}
            />
            <input
              value={u.title}
              onChange={(e) => update((d) => void (d[ui].title = e.target.value))}
              placeholder="Unidade (ex: Produzir elementos multimídia...)"
              className={`${inputCls} font-medium`}
            />
            <button
              onClick={() => update((d) => void d.splice(ui, 1))}
              className="rounded border border-border px-2 py-1 text-xs text-danger hover:bg-danger/10"
              title="Remover unidade"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-3 pl-4">
            {u.elements.map((el, ei) => (
              <div key={ei} className="rounded-xl border border-border/70 p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={el.code}
                    onChange={(e) => update((d) => void (d[ui].elements[ei].code = e.target.value))}
                    placeholder="Cód."
                    className={`${inputCls} w-16`}
                  />
                  <input
                    value={el.title}
                    onChange={(e) => update((d) => void (d[ui].elements[ei].title = e.target.value))}
                    placeholder="Elemento (ex: Criar elementos multimídia...)"
                    className={inputCls}
                  />
                  <button
                    onClick={() => update((d) => void d[ui].elements.splice(ei, 1))}
                    className="rounded border border-border px-2 py-1 text-xs text-danger hover:bg-danger/10"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-2 flex flex-col gap-2 pl-4">
                  {el.criteria.map((cr, ci) => (
                    <div key={ci} className="rounded-lg bg-muted/30 p-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={cr.code}
                          onChange={(e) => update((d) => void (d[ui].elements[ei].criteria[ci].code = e.target.value))}
                          placeholder="Cód."
                          className={`${inputCls} w-16`}
                        />
                        <input
                          value={cr.description}
                          onChange={(e) =>
                            update((d) => void (d[ui].elements[ei].criteria[ci].description = e.target.value))
                          }
                          placeholder="Critério / padrão de desempenho"
                          className={inputCls}
                        />
                        <button
                          onClick={() => update((d) => void d[ui].elements[ei].criteria.splice(ci, 1))}
                          className="rounded border border-border px-2 py-1 text-xs text-danger hover:bg-danger/10"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="mt-2 flex flex-col gap-2 pl-4">
                        {cr.items.map((it, ii) => (
                          <div key={ii} className="rounded border border-border bg-background p-2">
                            <div className="flex items-center gap-2">
                              <input
                                value={it.code}
                                onChange={(e) =>
                                  update((d) => void (d[ui].elements[ei].criteria[ci].items[ii].code = e.target.value))
                                }
                                placeholder="Cód."
                                className={`${inputCls} w-16`}
                              />
                              <input
                                value={it.description}
                                onChange={(e) =>
                                  update(
                                    (d) => void (d[ui].elements[ei].criteria[ci].items[ii].description = e.target.value),
                                  )
                                }
                                placeholder="Item / evidência observável (Sim/Não)"
                                className={inputCls}
                              />
                              <input
                                type="number"
                                min={0}
                                step={0.5}
                                value={it.points}
                                onChange={(e) =>
                                  update(
                                    (d) =>
                                      void (d[ui].elements[ei].criteria[ci].items[ii].points = Number(e.target.value)),
                                  )
                                }
                                title="Pontos"
                                className={`${inputCls} w-20`}
                              />
                              <button
                                onClick={() => update((d) => void d[ui].elements[ei].criteria[ci].items.splice(ii, 1))}
                                className="rounded border border-border px-2 py-1 text-xs text-danger hover:bg-danger/10"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="mt-1 grid grid-cols-2 gap-2">
                              <select
                                value={it.competency_id}
                                onChange={(e) =>
                                  update(
                                    (d) =>
                                      void (d[ui].elements[ei].criteria[ci].items[ii].competency_id = e.target.value),
                                  )
                                }
                                className={`${inputCls} text-xs`}
                              >
                                <option value="">— Capacidade —</option>
                                {competencies.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.code} — {c.description}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={it.knowledge_object_id}
                                onChange={(e) =>
                                  update(
                                    (d) =>
                                      void (d[ui].elements[ei].criteria[ci].items[ii].knowledge_object_id =
                                        e.target.value),
                                  )
                                }
                                className={`${inputCls} text-xs`}
                              >
                                <option value="">— Objeto —</option>
                                {knowledgeObjects.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.code} — {o.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() =>
                            update((d) =>
                              void d[ui].elements[ei].criteria[ci].items.push({
                                code: "",
                                description: "",
                                points: 1,
                                competency_id: "",
                                knowledge_object_id: "",
                              }),
                            )
                          }
                          className="self-start rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                        >
                          + item
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      update((d) => void d[ui].elements[ei].criteria.push({ code: "", description: "", items: [] }))
                    }
                    className="self-start rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                  >
                    + critério
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => update((d) => void d[ui].elements.push({ code: "", title: "", criteria: [] }))}
              className="self-start rounded border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              + elemento
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={() => update((d) => void d.push({ code: "", title: "", elements: [] }))}
        className="self-start rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
      >
        + unidade
      </button>

      {msg && <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm">{msg}</div>}

      <div>
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Salvando..." : "Salvar lista de verificação"}
        </Button>
      </div>
    </div>
  );
}
