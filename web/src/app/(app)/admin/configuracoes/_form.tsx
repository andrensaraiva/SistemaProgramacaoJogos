"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { salvarConfiguracoes, type AdminActionState } from "@/lib/admin/actions";

function err(state: AdminActionState, field: string): string | undefined {
  return state && "errors" in state ? state.errors?.[field]?.[0] : undefined;
}

export function ConfigForm({
  institutionName,
  notaAprovacao,
  notaRecuperacaoMin,
  freqMinPct,
  senhaSufixo,
  toolPixelArt,
  toolVetor,
  toolArteDigital,
  toolBlocos,
}: {
  institutionName: string;
  notaAprovacao: number;
  notaRecuperacaoMin: number;
  freqMinPct: number;
  senhaSufixo: string;
  toolPixelArt: boolean;
  toolVetor: boolean;
  toolArteDigital: boolean;
  toolBlocos: boolean;
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    salvarConfiguracoes,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Nome da instituição" htmlFor="institution_name" error={err(state, "institution_name")}>
        <Input id="institution_name" name="institution_name" defaultValue={institutionName} required />
      </Field>

      <Field label="Sufixo da senha inicial" htmlFor="senha_sufixo" error={err(state, "senha_sufixo")}>
        <Input id="senha_sufixo" name="senha_sufixo" defaultValue={senhaSufixo} maxLength={12} required />
        <p className="mt-1 text-xs text-muted-foreground">
          A senha inicial é o primeiro nome + este sufixo (ex.: &quot;Joao@2026&quot;). O usuário troca no 1º acesso.
        </p>
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nota de aprovação (≥)" htmlFor="nota_aprovacao" error={err(state, "nota_aprovacao")}>
          <Input id="nota_aprovacao" name="nota_aprovacao" type="number" step="0.1" min="0" max="10" defaultValue={notaAprovacao} />
        </Field>
        <Field label="Nota mínima p/ recuperação" htmlFor="nota_recuperacao_min" error={err(state, "nota_recuperacao_min")}>
          <Input id="nota_recuperacao_min" name="nota_recuperacao_min" type="number" step="0.1" min="0" max="10" defaultValue={notaRecuperacaoMin} />
        </Field>
        <Field label="Frequência mínima (%)" htmlFor="frequencia_minima_pct" error={err(state, "frequencia_minima_pct")}>
          <Input id="frequencia_minima_pct" name="frequencia_minima_pct" type="number" min="0" max="100" defaultValue={freqMinPct} />
        </Field>
      </div>

      <div className="rounded-lg border border-border p-3">
        <h3 className="mb-1 text-sm font-semibold">Ferramentas de exercício (criativas)</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Ligue/desligue os editores que os professores podem usar ao criar atividades.
        </p>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="tool_pixel_art" defaultChecked={toolPixelArt} className="h-4 w-4" />
            Pixel Art (sprites)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="tool_vetor" defaultChecked={toolVetor} className="h-4 w-4" />
            Vetor (formas/caminhos)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="tool_arte_digital" defaultChecked={toolArteDigital} className="h-4 w-4" />
            Arte Digital (pincel/camadas)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="tool_blocos" defaultChecked={toolBlocos} className="h-4 w-4" />
            Blocos / Celeste (programação visual)
          </label>
        </div>
      </div>

      {state?.ok && state.message && (
        <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
          {state.message}
        </div>
      )}
      {state && !state.ok && state.message && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </div>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>
    </form>
  );
}
