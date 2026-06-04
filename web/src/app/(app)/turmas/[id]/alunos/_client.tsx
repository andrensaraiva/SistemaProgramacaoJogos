"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import {
  criarAluno,
  criarAlunosEmMassa,
  resetarSenhaAluno,
  type AlunosActionState,
  type AlunoLinha,
} from "@/lib/alunos/actions";

type Aba = "individual" | "colar" | "dinamico";

export function CadastroAlunos({ classId }: { classId: string }) {
  const [aba, setAba] = useState<Aba>("individual");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <TabBtn ativo={aba === "individual"} onClick={() => setAba("individual")}>
          Um a um
        </TabBtn>
        <TabBtn ativo={aba === "colar"} onClick={() => setAba("colar")}>
          Colar / CSV
        </TabBtn>
        <TabBtn ativo={aba === "dinamico"} onClick={() => setAba("dinamico")}>
          Vários (formulário)
        </TabBtn>
      </div>

      {aba === "individual" && <FormIndividual classId={classId} />}
      {aba === "colar" && <FormColar classId={classId} />}
      {aba === "dinamico" && <FormDinamico classId={classId} />}
    </div>
  );
}

function TabBtn({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        ativo ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

// -----------------------------------------------------------------------------
// Relatório de resultado (compartilhado)
// -----------------------------------------------------------------------------

function Relatorio({ linhas }: { linhas: AlunoLinha[] }) {
  if (linhas.length === 0) return null;
  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border px-3 py-2 text-sm font-semibold">
        Resultado ({linhas.length})
      </div>
      <ul className="divide-y divide-border text-sm">
        {linhas.map((l, i) => (
          <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0 truncate">{l.displayName}</span>
            {l.status === "erro" ? (
              <span className="shrink-0 text-xs text-danger">{l.message ?? "erro"}</span>
            ) : l.status === "matriculado" ? (
              <span className="shrink-0 text-xs text-muted-foreground">já existia — matriculado</span>
            ) : (
              <code className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs">
                senha: {l.tempPassword}
              </code>
            )}
          </li>
        ))}
      </ul>
      <p className="px-3 py-2 text-xs text-muted-foreground">
        Anote as senhas temporárias — elas não serão exibidas de novo. Cada aluno
        troca a senha no primeiro acesso.
      </p>
    </div>
  );
}

function Erro({ state }: { state: AlunosActionState }) {
  if (!state || state.ok || !state.message) return null;
  return (
    <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
      {state.message}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Um a um
// -----------------------------------------------------------------------------

function FormIndividual({ classId }: { classId: string }) {
  const [state, action, pending] = useActionState<AlunosActionState, FormData>(
    criarAluno,
    undefined,
  );
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="class_id" value={classId} />
      <Field
        label="Nome completo"
        htmlFor="display_name"
        error={state && "errors" in state ? state.errors?.display_name?.[0] : undefined}
      >
        <Input id="display_name" name="display_name" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="E-mail institucional"
          htmlFor="institutional_email"
          error={state && "errors" in state ? state.errors?.institutional_email?.[0] : undefined}
        >
          <Input id="institutional_email" name="institutional_email" type="email" />
        </Field>
        <Field label="E-mail pessoal" htmlFor="personal_email">
          <Input id="personal_email" name="personal_email" type="email" />
        </Field>
      </div>
      <Erro state={state} />
      {state?.ok && <Relatorio linhas={state.resultado} />}
      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : "Cadastrar aluno"}
      </Button>
    </form>
  );
}

// -----------------------------------------------------------------------------
// Colar / CSV
// -----------------------------------------------------------------------------

function FormColar({ classId }: { classId: string }) {
  const [state, action, pending] = useActionState<AlunosActionState, FormData>(
    criarAlunosEmMassa,
    undefined,
  );
  const [texto, setTexto] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTexto(await file.text());
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="class_id" value={classId} />
      <p className="text-sm text-muted-foreground">
        Uma linha por aluno: <code>Nome, email institucional, email pessoal</code>.
        O e-mail pessoal é opcional (mínimo um e-mail). Separe por vírgula,
        ponto-e-vírgula ou tabulação. Você pode colar de uma planilha.
      </p>
      <input
        type="file"
        accept=".csv,text/csv,text/plain"
        onChange={onFile}
        className="text-sm"
      />
      <textarea
        name="alunos"
        required
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={8}
        placeholder={"Ana Souza, ana@escola.br, ana@gmail.com\nBruno Lima, bruno@escola.br"}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
      />
      <Erro state={state} />
      {state?.ok && <Relatorio linhas={state.resultado} />}
      <Button type="submit" disabled={pending}>
        {pending ? "Cadastrando..." : "Cadastrar em massa"}
      </Button>
    </form>
  );
}

// -----------------------------------------------------------------------------
// Formulário dinâmico (+ linhas) — monta o mesmo texto do em massa
// -----------------------------------------------------------------------------

type Linha = { nome: string; inst: string; pess: string };

function FormDinamico({ classId }: { classId: string }) {
  const [state, action, pending] = useActionState<AlunosActionState, FormData>(
    criarAlunosEmMassa,
    undefined,
  );
  const [linhas, setLinhas] = useState<Linha[]>([
    { nome: "", inst: "", pess: "" },
    { nome: "", inst: "", pess: "" },
  ]);

  function set(i: number, campo: keyof Linha, valor: string) {
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }
  function add() {
    setLinhas((prev) => [...prev, { nome: "", inst: "", pess: "" }]);
  }
  function remove(i: number) {
    setLinhas((prev) => prev.filter((_, idx) => idx !== i));
  }

  const texto = linhas
    .filter((l) => l.nome.trim() || l.inst.trim() || l.pess.trim())
    .map((l) => [l.nome, l.inst, l.pess].join(", "))
    .join("\n");

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="alunos" value={texto} />

      <div className="flex flex-col gap-2">
        {linhas.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
            <Input
              placeholder="Nome"
              value={l.nome}
              onChange={(e) => set(i, "nome", e.target.value)}
            />
            <Input
              placeholder="E-mail institucional"
              type="email"
              value={l.inst}
              onChange={(e) => set(i, "inst", e.target.value)}
            />
            <Input
              placeholder="E-mail pessoal"
              type="email"
              value={l.pess}
              onChange={(e) => set(i, "pess", e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => remove(i)}
              className="px-3"
              aria-label="Remover linha"
            >
              ✕
            </Button>
          </div>
        ))}
      </div>

      <div>
        <Button type="button" variant="secondary" onClick={add} className="text-sm">
          + Adicionar linha
        </Button>
      </div>

      <Erro state={state} />
      {state?.ok && <Relatorio linhas={state.resultado} />}
      <Button type="submit" disabled={pending}>
        {pending ? "Cadastrando..." : "Cadastrar todos"}
      </Button>
    </form>
  );
}

// -----------------------------------------------------------------------------
// Reset de senha por aluno (na lista)
// -----------------------------------------------------------------------------

export function PedidoResetAluno({
  alunoId,
  nome,
  pedidoId,
}: {
  alunoId: string;
  nome: string;
  pedidoId?: string;
}) {
  const [state, action, pending] = useActionState<AlunosActionState, FormData>(
    resetarSenhaAluno,
    undefined,
  );

  const senha =
    state?.ok && state.resultado[0]?.tempPassword ? state.resultado[0].tempPassword : null;

  return (
    <div className="shrink-0 text-right">
      <form action={action}>
        <input type="hidden" name="aluno_id" value={alunoId} />
        <Button
          type="submit"
          variant={pedidoId ? "primary" : "ghost"}
          disabled={pending}
          className="px-3 py-1.5 text-xs"
          title={`Redefinir senha de ${nome}`}
        >
          {pedidoId ? "Aprovar reset" : "Redefinir senha"}
        </Button>
      </form>
      {senha && (
        <code className="mt-1 inline-block rounded bg-muted px-2 py-0.5 text-xs">
          senha: {senha}
        </code>
      )}
      {state && !state.ok && state.message && (
        <p className="mt-1 text-xs text-danger">{state.message}</p>
      )}
    </div>
  );
}
