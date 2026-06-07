"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import {
  criarAdmin,
  criarCoordenador,
  criarProfessor,
  definirNivelAdmin,
  editarProfessor,
  reativarUsuario,
  resetarSenhaUsuario,
  resolverPedidoReset,
  suspenderUsuario,
  type AdminActionState,
} from "@/lib/admin/actions";
import { criarCursoManual } from "@/lib/curriculum/actions";

// -----------------------------------------------------------------------------
// Helpers visuais
// -----------------------------------------------------------------------------

function Msg({ state }: { state: AdminActionState }) {
  if (!state) return null;
  if (state.ok && state.message) {
    return (
      <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
        {state.message}
      </div>
    );
  }
  if (!state.ok && state.message) {
    return (
      <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
        {state.message}
      </div>
    );
  }
  return null;
}

function err(state: AdminActionState, field: string): string | undefined {
  return state && "errors" in state ? state.errors?.[field]?.[0] : undefined;
}

// -----------------------------------------------------------------------------
// Nova conta (professor ou admin)
// -----------------------------------------------------------------------------

type ContaTipo = "professor" | "coordenador" | "admin";

const TIPO_LABEL: Record<ContaTipo, string> = {
  professor: "professor",
  coordenador: "coordenador",
  admin: "administrador",
};

const TIPO_ACTION = {
  professor: criarProfessor,
  coordenador: criarCoordenador,
  admin: criarAdmin,
} as const;

export function NovaContaForm({ isMaster = false }: { isMaster?: boolean }) {
  // Qualquer admin cria professor e coordenador; só o master cria administradores.
  const [tipo, setTipo] = useState<ContaTipo>("professor");
  const tabs: ContaTipo[] = isMaster
    ? ["professor", "coordenador", "admin"]
    : ["professor", "coordenador"];
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(
    TIPO_ACTION[tipo],
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${tipo === t ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted"}`}
          >
            {TIPO_LABEL[t]}
          </button>
        ))}
      </div>

      <Field label="Nome completo" htmlFor="display_name" error={err(state, "display_name")}>
        <Input id="display_name" name="display_name" required />
      </Field>
      <Field label="E-mail institucional" htmlFor="institutional_email" error={err(state, "institutional_email")}>
        <Input id="institutional_email" name="institutional_email" type="email" />
      </Field>
      <Field label="E-mail pessoal (opcional)" htmlFor="personal_email">
        <Input id="personal_email" name="personal_email" type="email" />
      </Field>

      {tipo === "admin" && isMaster && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_master" className="h-4 w-4" />
          Tornar administrador master (pode gerenciar outros admins)
        </label>
      )}

      <Msg state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Criando..." : `Criar ${TIPO_LABEL[tipo]}`}
      </Button>
    </form>
  );
}

// -----------------------------------------------------------------------------
// Linha de administrador (master gerencia: promover/rebaixar, suspender)
// -----------------------------------------------------------------------------

export function AdminRowItem({
  id,
  nome,
  email,
  isMaster,
  disabled,
  souEu,
}: {
  id: string;
  nome: string;
  email: string;
  isMaster: boolean;
  disabled: boolean;
  souEu: boolean;
}) {
  const [nivelState, nivelAction, nivelPending] = useActionState<AdminActionState, FormData>(definirNivelAdmin, undefined);
  const [statusState, statusAction, statusPending] = useActionState<AdminActionState, FormData>(
    disabled ? reativarUsuario : suspenderUsuario,
    undefined,
  );

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">
            {nome}{" "}
            {isMaster && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">master</span>}
            {disabled && <span className="text-xs text-danger">(suspenso)</span>}
            {souEu && <span className="text-xs text-muted-foreground"> · você</span>}
          </div>
          <div className="truncate text-xs text-muted-foreground">{email}</div>
        </div>
        {!souEu && (
          <div className="flex flex-wrap gap-2">
            <form action={nivelAction}>
              <input type="hidden" name="admin_id" value={id} />
              <input type="hidden" name="is_master" value={(!isMaster).toString()} />
              <Button type="submit" variant="ghost" disabled={nivelPending} className="px-3 py-1.5 text-xs">
                {isMaster ? "Rebaixar" : "Promover a master"}
              </Button>
            </form>
            <form action={statusAction}>
              <input type="hidden" name="user_id" value={id} />
              <Button type="submit" variant={disabled ? "secondary" : "danger"} disabled={statusPending} className="px-3 py-1.5 text-xs">
                {disabled ? "Reativar" : "Suspender"}
              </Button>
            </form>
          </div>
        )}
      </div>
      {(nivelState || statusState) && (
        <div className="mt-2 space-y-1">
          <Msg state={nivelState} />
          <Msg state={statusState} />
        </div>
      )}
    </li>
  );
}

// -----------------------------------------------------------------------------
// Linha de coordenador (suspender/reativar + resetar senha)
// -----------------------------------------------------------------------------

export function CoordenadorRowItem({
  id,
  nome,
  email,
  disabled,
}: {
  id: string;
  nome: string;
  email: string;
  disabled: boolean;
}) {
  const [statusState, statusAction, statusPending] = useActionState<AdminActionState, FormData>(
    disabled ? reativarUsuario : suspenderUsuario,
    undefined,
  );
  const [resetState, resetAction, resetPending] = useActionState<AdminActionState, FormData>(
    resetarSenhaUsuario,
    undefined,
  );

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">
            {nome} {disabled && <span className="text-xs text-danger">(suspenso)</span>}
          </div>
          <div className="truncate text-xs text-muted-foreground">{email}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={resetAction}>
            <input type="hidden" name="user_id" value={id} />
            <Button type="submit" variant="ghost" disabled={resetPending} className="px-3 py-1.5 text-xs">
              Resetar senha
            </Button>
          </form>
          <form action={statusAction}>
            <input type="hidden" name="user_id" value={id} />
            <Button type="submit" variant={disabled ? "secondary" : "danger"} disabled={statusPending} className="px-3 py-1.5 text-xs">
              {disabled ? "Reativar" : "Suspender"}
            </Button>
          </form>
        </div>
      </div>
      {(statusState || resetState) && (
        <div className="mt-2 space-y-1">
          <Msg state={statusState} />
          <Msg state={resetState} />
        </div>
      )}
    </li>
  );
}

// -----------------------------------------------------------------------------
// Criar curso manual
// -----------------------------------------------------------------------------

export function CursoManualForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(criarCursoManual, undefined);

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} className="text-sm">
        + Criar curso manualmente
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input name="name" placeholder="Nome do curso" required />
        <Input name="eixo" placeholder="Eixo (opcional)" />
        <Input name="carga_horaria_total" type="number" placeholder="Carga horária (h)" />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-danger">{state.message}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Criando..." : "Criar e editar"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// -----------------------------------------------------------------------------
// Pedido de reset (aprovar/recusar)
// -----------------------------------------------------------------------------

export function PedidoResetItem({
  id,
  nome,
  email,
  papel,
}: {
  id: string;
  nome: string;
  email: string;
  papel: string;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    resolverPedidoReset,
    undefined,
  );

  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{nome}</div>
          <div className="text-xs text-muted-foreground">
            {email} · {papel}
          </div>
        </div>
        <form action={action} className="flex gap-2">
          <input type="hidden" name="request_id" value={id} />
          <Button type="submit" name="acao" value="aprovar" disabled={pending} className="px-3 py-1.5 text-xs">
            Aprovar
          </Button>
          <Button type="submit" name="acao" value="recusar" variant="ghost" disabled={pending} className="px-3 py-1.5 text-xs">
            Recusar
          </Button>
        </form>
      </div>
      <div className="mt-2">
        <Msg state={state} />
      </div>
    </li>
  );
}

// -----------------------------------------------------------------------------
// Linha de professor com edição inline + ações
// -----------------------------------------------------------------------------

export function ProfessorRow({
  id,
  nome,
  institutionalEmail,
  personalEmail,
  profileCompleted,
  disabled,
}: {
  id: string;
  nome: string;
  institutionalEmail: string | null;
  personalEmail: string | null;
  profileCompleted: boolean;
  disabled: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [editState, editAction, editPending] = useActionState<AdminActionState, FormData>(editarProfessor, undefined);
  const [resetState, resetAction, resetPending] = useActionState<AdminActionState, FormData>(resetarSenhaUsuario, undefined);
  const [statusState, statusAction, statusPending] = useActionState<AdminActionState, FormData>(
    disabled ? reativarUsuario : suspenderUsuario,
    undefined,
  );

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">
            {nome} {disabled && <span className="text-xs text-danger">(suspenso)</span>}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {institutionalEmail ?? personalEmail ?? "—"}
            {!profileCompleted && " · aguardando 1º acesso"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setEditando((v) => !v)} className="px-3 py-1.5 text-xs">
            {editando ? "Fechar" : "Editar"}
          </Button>
          <form action={resetAction}>
            <input type="hidden" name="user_id" value={id} />
            <Button type="submit" variant="ghost" disabled={resetPending} className="px-3 py-1.5 text-xs">
              Resetar senha
            </Button>
          </form>
          <form action={statusAction}>
            <input type="hidden" name="user_id" value={id} />
            <Button type="submit" variant={disabled ? "secondary" : "danger"} disabled={statusPending} className="px-3 py-1.5 text-xs">
              {disabled ? "Reativar" : "Suspender"}
            </Button>
          </form>
        </div>
      </div>

      {(resetState || statusState) && (
        <div className="mt-2 space-y-2">
          <Msg state={resetState} />
          <Msg state={statusState} />
        </div>
      )}

      {editando && (
        <form action={editAction} className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
          <input type="hidden" name="professor_id" value={id} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Nome" htmlFor={`n-${id}`} error={err(editState, "display_name")}>
              <Input id={`n-${id}`} name="display_name" defaultValue={nome} />
            </Field>
            <Field label="E-mail institucional" htmlFor={`i-${id}`} error={err(editState, "institutional_email")}>
              <Input id={`i-${id}`} name="institutional_email" type="email" defaultValue={institutionalEmail ?? ""} />
            </Field>
            <Field label="E-mail pessoal" htmlFor={`p-${id}`}>
              <Input id={`p-${id}`} name="personal_email" type="email" defaultValue={personalEmail ?? ""} />
            </Field>
          </div>
          <div className="mt-2">
            <Msg state={editState} />
          </div>
          <Button type="submit" disabled={editPending} className="mt-2 px-3 py-1.5 text-xs">
            {editPending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      )}
    </li>
  );
}

// -----------------------------------------------------------------------------
// Linha de aluno (reset + suspender)
// -----------------------------------------------------------------------------

export function AlunoRow({
  id,
  nome,
  email,
  profileCompleted,
  disabled,
}: {
  id: string;
  nome: string;
  email: string;
  profileCompleted: boolean;
  disabled: boolean;
}) {
  const [resetState, resetAction, resetPending] = useActionState<AdminActionState, FormData>(resetarSenhaUsuario, undefined);
  const [statusState, statusAction, statusPending] = useActionState<AdminActionState, FormData>(
    disabled ? reativarUsuario : suspenderUsuario,
    undefined,
  );

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">
            {nome} {disabled && <span className="text-xs text-danger">(suspenso)</span>}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {email}
            {!profileCompleted && " · aguardando 1º acesso"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={resetAction}>
            <input type="hidden" name="user_id" value={id} />
            <Button type="submit" variant="ghost" disabled={resetPending} className="px-3 py-1.5 text-xs">
              Resetar senha
            </Button>
          </form>
          <form action={statusAction}>
            <input type="hidden" name="user_id" value={id} />
            <Button type="submit" variant={disabled ? "secondary" : "danger"} disabled={statusPending} className="px-3 py-1.5 text-xs">
              {disabled ? "Reativar" : "Suspender"}
            </Button>
          </form>
        </div>
      </div>
      {(resetState || statusState) && (
        <div className="mt-2 space-y-2">
          <Msg state={resetState} />
          <Msg state={statusState} />
        </div>
      )}
    </li>
  );
}

// -----------------------------------------------------------------------------
// Busca de alunos (atualiza querystring ?q=)
// -----------------------------------------------------------------------------

export function BuscaAlunos({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [valor, setValor] = useState(defaultValue);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (valor.trim()) params.set("q", valor.trim());
    router.push(`/admin?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Buscar aluno..."
        className="h-9"
      />
      <Button type="submit" variant="secondary" className="px-3 py-1.5 text-sm">
        Buscar
      </Button>
    </form>
  );
}
