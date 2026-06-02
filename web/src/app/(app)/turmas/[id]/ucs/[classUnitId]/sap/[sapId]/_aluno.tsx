"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { entregarSap } from "@/lib/sap/actions";

import type { RubricUnitView } from "./_manager";

export function SapAluno({
  assessmentId,
  title,
  description,
  ucTitle,
  rubric,
  myLink,
  submittedAt,
  evaluated,
  score,
  maxScore,
  feedback,
  marks,
}: {
  assessmentId: string;
  title: string;
  description: string | null;
  ucTitle: string;
  rubric: RubricUnitView[];
  myLink: string | null;
  submittedAt: string | null;
  evaluated: boolean;
  score: number | null;
  maxScore: number | null;
  feedback: string | null;
  marks: Record<string, { met: boolean; justification: string | null }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState(myLink ?? "");
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  function deliver() {
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await entregarSap(assessmentId, { link });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setOkMsg("Entrega registrada!");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{ucTitle} · SAP prático</p>
        {description && <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm text-foreground">{description}</p>}
      </div>

      {/* Resultado (se já avaliado) */}
      {evaluated && (
        <div className="rounded-2xl border border-success/40 bg-success/10 p-5">
          <div className="text-2xl font-bold">
            Nota: {score}/{maxScore}
          </div>
          {feedback && <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{feedback}</p>}
        </div>
      )}

      {/* Entrega */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-2 text-lg font-semibold">Sua entrega</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Cole o link do seu trabalho (build/itch.io, GitHub, Drive...).
          {submittedAt ? ` Última entrega: ${new Date(submittedAt).toLocaleString("pt-BR")}.` : ""}
        </p>
        <div className="flex flex-col gap-3">
          <Field label="Link da entrega" htmlFor="link">
            <Input
              id="link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
            />
          </Field>
          {error && (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
          )}
          {okMsg && (
            <div className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
              {okMsg}
            </div>
          )}
          <div>
            <Button type="button" onClick={deliver} disabled={pending}>
              {pending ? "Enviando..." : myLink ? "Atualizar entrega" : "Entregar"}
            </Button>
          </div>
        </div>
      </section>

      {/* Lista de verificação (critérios) */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Critérios de avaliação</h2>
        {rubric.length === 0 ? (
          <p className="text-sm text-muted-foreground">O professor ainda não publicou os critérios.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {rubric.map((u) => (
              <div key={u.id}>
                <div className="text-sm font-semibold">
                  {u.code ? `${u.code} · ` : ""}
                  {u.title}
                </div>
                {u.elements.map((e) => (
                  <div key={e.id} className="mt-1 pl-3">
                    <div className="text-xs font-medium text-muted-foreground">
                      {e.code ? `${e.code} · ` : ""}
                      {e.title}
                    </div>
                    {e.criteria.map((c) => (
                      <div key={c.id} className="mt-1 pl-3">
                        <div className="text-xs text-muted-foreground">
                          {c.code ? `${c.code} · ` : ""}
                          {c.description}
                        </div>
                        <ul className="mt-1 flex flex-col gap-1 pl-2">
                          {c.items.map((it) => {
                            const mk = evaluated ? marks[it.id] : undefined;
                            return (
                              <li key={it.id} className="flex items-start gap-2 text-sm">
                                {evaluated ? (
                                  <span className={mk?.met ? "text-success" : "text-danger"}>
                                    {mk?.met ? "✓" : "✗"}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">•</span>
                                )}
                                <span>
                                  {it.description}{" "}
                                  <span className="text-xs text-muted-foreground">({it.points} pt)</span>
                                  {evaluated && mk && !mk.met && mk.justification && (
                                    <span className="block text-xs text-muted-foreground">— {mk.justification}</span>
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
