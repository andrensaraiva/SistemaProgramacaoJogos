"use client";

import { useState, useTransition } from "react";

import { ConfirmForm } from "@/components/confirm-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  criarGrupo,
  definirMembros,
  excluirGrupo,
} from "@/lib/groups/actions";

type Aluno = { id: string; name: string };
type Grupo = { id: string; name: string; memberIds: string[] };

export function GruposManager({
  classId,
  alunos,
  grupos,
}: {
  classId: string;
  alunos: Aluno[];
  grupos: Grupo[];
}) {
  const [novoNome, setNovoNome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function novoGrupo() {
    if (!novoNome.trim()) return;
    setError(null);
    const fd = new FormData();
    fd.set("name", novoNome);
    start(async () => {
      const res = await criarGrupo(classId, fd);
      if (!res.ok) setError(res.message);
      else setNovoNome("");
    });
  }

  if (!alunos.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta turma ainda não tem alunos. Compartilhe o código de convite primeiro.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">Novo grupo</span>
            <Input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex: Grupo 1 — Plataforma 2D"
            />
          </label>
          <Button type="button" onClick={novoGrupo} disabled={pending || !novoNome.trim()}>
            + Criar grupo
          </Button>
        </div>
        {error && (
          <div className="mt-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}
      </Card>

      {grupos.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum grupo criado ainda.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {grupos.map((g) => (
          <GrupoCard key={g.id} classId={classId} grupo={g} alunos={alunos} />
        ))}
      </div>
    </div>
  );
}

function GrupoCard({
  classId,
  grupo,
  alunos,
}: {
  classId: string;
  grupo: Grupo;
  alunos: Aluno[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(grupo.memberIds),
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(id: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function salvar() {
    setError(null);
    start(async () => {
      const res = await definirMembros(classId, grupo.id, [...selected]);
      if (!res.ok) setError(res.message);
      else setSaved(true);
    });
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{grupo.name}</h3>
        <ConfirmForm action={excluirGrupo} message={`Excluir o grupo "${grupo.name}"?`}>
          <input type="hidden" name="class_id" value={classId} />
          <input type="hidden" name="group_id" value={grupo.id} />
          <Button type="submit" variant="ghost">
            ✕
          </Button>
        </ConfirmForm>
      </div>

      <div className="flex flex-col gap-1.5">
        {alunos.map((a) => (
          <label
            key={a.id}
            className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/50"
          >
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={selected.has(a.id)}
              onChange={() => toggle(a.id)}
            />
            {a.name}
          </label>
        ))}
      </div>

      {error && (
        <div className="mt-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <Button type="button" variant="secondary" onClick={salvar} disabled={pending}>
          {pending ? "Salvando..." : "Salvar membros"}
        </Button>
        {saved && <span className="text-xs text-success">Salvo!</span>}
        <span className="text-xs text-muted-foreground">
          {selected.size} membro(s)
        </span>
      </div>
    </Card>
  );
}
