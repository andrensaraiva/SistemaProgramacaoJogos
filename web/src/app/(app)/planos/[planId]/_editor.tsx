"use client";

import { useState, useTransition } from "react";

import { ConfirmForm } from "@/components/confirm-form";
import { Button } from "@/components/ui/button";
import { excluirBloco, salvarBloco } from "@/lib/curriculum/actions";

type Block = {
  id: string;
  title: string;
  aula_inicio: number | null;
  aula_fim: number | null;
  conteudo: string | null;
  apresentacao_url: string | null;
  atividade: string | null;
  criterios: string | null;
  ord: number;
};

const inputCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";
const taCls = `${inputCls} resize-y`;

function BlockForm({
  planId,
  block,
  onDone,
}: {
  planId: string;
  block?: Block;
  onDone?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function action(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await salvarBloco(planId, formData);
      if (!res.ok) setError(res.message);
      else onDone?.();
    });
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      {block && <input type="hidden" name="block_id" value={block.id} />}
      <div className="grid gap-2 sm:grid-cols-[1fr_100px_100px]">
        <input
          name="title"
          defaultValue={block?.title ?? ""}
          placeholder="Título do bloco (ex: Bloco 01 — Aulas 01–12)"
          required
          className={inputCls}
        />
        <input
          name="aula_inicio"
          type="number"
          defaultValue={block?.aula_inicio ?? ""}
          placeholder="Aula ini."
          className={inputCls}
        />
        <input
          name="aula_fim"
          type="number"
          defaultValue={block?.aula_fim ?? ""}
          placeholder="Aula fim"
          className={inputCls}
        />
      </div>
      <textarea
        name="conteudo"
        defaultValue={block?.conteudo ?? ""}
        rows={3}
        placeholder="Conteúdo da(s) aula(s)..."
        className={taCls}
      />
      <input
        name="apresentacao_url"
        defaultValue={block?.apresentacao_url ?? ""}
        placeholder="Link da apresentação (slides, Drive...)"
        className={inputCls}
      />
      <textarea
        name="atividade"
        defaultValue={block?.atividade ?? ""}
        rows={2}
        placeholder="Atividade / avaliação..."
        className={taCls}
      />
      <textarea
        name="criterios"
        defaultValue={block?.criterios ?? ""}
        rows={2}
        placeholder="Critérios de avaliação..."
        className={taCls}
      />
      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : block ? "Salvar alterações" : "Adicionar bloco"}
        </Button>
        {block && onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

function BlockCard({ planId, block }: { planId: string; block: Block }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="rounded-2xl border border-primary/40 bg-card p-4">
        <BlockForm planId={planId} block={block} onDone={() => setEditing(false)} />
      </div>
    );
  }

  const range =
    block.aula_inicio != null && block.aula_fim != null
      ? `Aulas ${block.aula_inicio}–${block.aula_fim}`
      : block.aula_inicio != null
        ? `A partir da aula ${block.aula_inicio}`
        : null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{block.title}</div>
          {range && (
            <div className="text-xs text-muted-foreground">{range}</div>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="ghost" onClick={() => setEditing(true)}>
            Editar
          </Button>
          <ConfirmForm action={excluirBloco} message="Remover este bloco?">
            <input type="hidden" name="block_id" value={block.id} />
            <input type="hidden" name="plan_id" value={planId} />
            <Button type="submit" variant="ghost">
              ✕
            </Button>
          </ConfirmForm>
        </div>
      </div>
      {block.conteudo && (
        <p className="whitespace-pre-line text-sm text-muted-foreground">
          {block.conteudo}
        </p>
      )}
      {block.apresentacao_url && (
        <a
          href={block.apresentacao_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline"
        >
          Apresentação
        </a>
      )}
      {block.atividade && (
        <p className="text-sm">
          <strong>Atividade:</strong> {block.atividade}
        </p>
      )}
      {block.criterios && (
        <p className="text-sm text-muted-foreground">
          <strong>Critérios:</strong> {block.criterios}
        </p>
      )}
    </div>
  );
}

export function PlanoEditor({
  planId,
  blocks,
}: {
  planId: string;
  blocks: Block[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((b) => (
        <BlockCard key={b.id} planId={planId} block={b} />
      ))}

      {!blocks.length && !adding && (
        <p className="text-sm text-muted-foreground">
          Nenhum bloco ainda. Adicione o primeiro bloco de aulas.
        </p>
      )}

      {adding ? (
        <div className="rounded-2xl border border-primary/40 bg-card p-4">
          <BlockForm planId={planId} onDone={() => setAdding(false)} />
        </div>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
          + Adicionar bloco de aulas
        </Button>
      )}
    </div>
  );
}
