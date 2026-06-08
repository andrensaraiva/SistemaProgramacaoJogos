"use client";

import { useState } from "react";

import type { AulaTimeline } from "@/lib/dashboard/uc-timeline";

function dataBR(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
}

// Linha do tempo de aulas: cada aula expande/colapsa o conteúdo do plano.
export function AulasTimeline({ aulas }: { aulas: AulaTimeline[] }) {
  if (aulas.length === 0) {
    return <p className="text-sm text-muted-foreground">Ainda não há aulas registradas nesta UC.</p>;
  }
  return (
    <ol className="flex flex-col gap-2">
      {aulas.map((aula) => (
        <AulaItem key={aula.key} aula={aula} />
      ))}
    </ol>
  );
}

function AulaItem({ aula }: { aula: AulaTimeline }) {
  const temConteudo = !!(aula.bloco?.conteudo || aula.bloco?.apresentacaoUrl);
  const [aberto, setAberto] = useState(false);

  const titulo =
    (aula.sessionNumber != null ? `Aula ${aula.sessionNumber}` : "Aula") +
    (aula.bloco ? ` — ${aula.bloco.title}` : aula.label ? ` — ${aula.label}` : "");

  return (
    <li className="rounded-lg border border-border bg-background/40">
      <button
        type="button"
        onClick={() => temConteudo && setAberto((v) => !v)}
        disabled={!temConteudo}
        aria-expanded={aberto}
        className={`flex w-full items-center justify-between gap-2 p-3 text-left ${
          temConteudo ? "cursor-pointer hover:bg-muted/40" : "cursor-default"
        }`}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          {temConteudo && (
            <span className={`text-xs text-muted-foreground transition-transform ${aberto ? "rotate-90" : ""}`}>
              ▶
            </span>
          )}
          {titulo}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {!temConteudo && <span className="text-xs text-muted-foreground">sem material</span>}
          {aula.date && <span className="text-xs text-muted-foreground">{dataBR(aula.date)}</span>}
        </span>
      </button>

      {aberto && temConteudo && (
        <div className="border-t border-border p-3">
          {aula.bloco?.conteudo && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">{aula.bloco.conteudo}</p>
          )}
          {aula.bloco?.apresentacaoUrl && (
            <a
              href={aula.bloco.apresentacaoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-primary hover:underline"
            >
              Abrir apresentação →
            </a>
          )}
        </div>
      )}
    </li>
  );
}
