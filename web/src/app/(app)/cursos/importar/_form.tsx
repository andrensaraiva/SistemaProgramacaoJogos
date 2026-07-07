"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { criarCursoFromDraft, type CourseDraft } from "@/lib/curriculum/actions";

// Tipo do rascunho devolvido por /api/ai/ppc (espelha PpcDraft de lib/ai/ppc.ts).
type Knowledge = { text: string; children?: string[] };
type Capability = { code?: string; description: string; kind?: string };
type Bibliography = { reference: string; tipo?: string };
type Unit = {
  title: string;
  carga_horaria_h?: number | null;
  objetivo_geral?: string;
  capabilities?: Capability[];
  knowledge?: Knowledge[];
  bibliography?: Bibliography[];
};
type ModuleDraft = { name: string; units: Unit[] };
type Draft = {
  name: string;
  eixo?: string;
  carga_horaria_total?: number | null;
  modules: ModuleDraft[];
};

const textareaCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

// Carrega o pdf.js sob demanda via CDN (não entra no bundle). Extrai o texto de
// todas as páginas do PDF no próprio navegador — o backend continua recebendo só texto.
const PDFJS_VERSION = "4.7.76";
const PDFJS_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { data: ArrayBuffer }) => {
    promise: Promise<{
      numPages: number;
      getPage: (n: number) => Promise<{
        getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
      }>;
    }>;
  };
};

let pdfjsPromise: Promise<PdfJsLib> | null = null;
async function loadPdfJs(): Promise<PdfJsLib> {
  if (!pdfjsPromise) {
    pdfjsPromise = import(/* webpackIgnore: true */ PDFJS_URL).then((mod) => {
      const lib = (mod.default ?? mod) as PdfJsLib;
      lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      return lib;
    });
  }
  return pdfjsPromise;
}

async function extrairTextoDoPdf(file: File): Promise<string> {
  const pdfjs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const partes: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    partes.push(content.items.map((it) => it.str ?? "").join(" "));
  }
  return partes.join("\n\n");
}

export function ImportarPpcForm() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, startSave] = useTransition();

  async function onPdfSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite reenviar o mesmo arquivo
    if (!file) return;
    setError(null);
    setPdfLoading(true);
    try {
      const extraido = await extrairTextoDoPdf(file);
      if (extraido.trim().length < 50) {
        throw new Error(
          "Não consegui extrair texto deste PDF (pode ser um PDF escaneado/imagem). Copie e cole o texto manualmente.",
        );
      }
      setText(extraido);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao ler o PDF. Cole o texto manualmente.",
      );
    } finally {
      setPdfLoading(false);
    }
  }

  async function analisar() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/ppc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao analisar o PPC.");
      setDraft(json.draft as Draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function salvar() {
    if (!draft) return;
    setError(null);
    startSave(async () => {
      const res = await criarCursoFromDraft(draft as CourseDraft);
      // Em sucesso a action faz redirect; só chega aqui se houve erro.
      if (res && !res.ok) setError(res.message);
    });
  }

  // -- Edição leve do rascunho (apenas os campos que mais importam revisar) --
  function patchCourse(p: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
  }
  function patchModule(mi: number, p: Partial<ModuleDraft>) {
    setDraft((d) => {
      if (!d) return d;
      const modules = d.modules.map((m, i) => (i === mi ? { ...m, ...p } : m));
      return { ...d, modules };
    });
  }
  function patchUnit(mi: number, ui: number, p: Partial<Unit>) {
    setDraft((d) => {
      if (!d) return d;
      const modules = d.modules.map((m, i) => {
        if (i !== mi) return m;
        const units = m.units.map((u, j) => (j === ui ? { ...u, ...p } : u));
        return { ...m, units };
      });
      return { ...d, modules };
    });
  }
  function removeUnit(mi: number, ui: number) {
    setDraft((d) => {
      if (!d) return d;
      const modules = d.modules.map((m, i) => {
        if (i !== mi) return m;
        return { ...m, units: m.units.filter((_, j) => j !== ui) };
      });
      return { ...d, modules };
    });
  }
  function removeModule(mi: number) {
    setDraft((d) =>
      d ? { ...d, modules: d.modules.filter((_, i) => i !== mi) } : d,
    );
  }

  if (!draft) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border bg-card p-4">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={onPdfSelected}
              disabled={pdfLoading}
              className="hidden"
            />
            <span className="inline-flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/70 disabled:opacity-50 border border-border">
              {pdfLoading ? "Lendo PDF..." : "📄 Enviar PDF do PPC"}
            </span>
          </label>
          <span className="text-xs text-muted-foreground">
            O texto é extraído no seu navegador e cai no campo abaixo. Você pode
            revisar antes de analisar. PDFs escaneados (imagem) não funcionam —
            nesse caso, copie e cole o texto.
          </span>
        </div>

        <Field label="Texto do PPC" htmlFor="ppc">
          <textarea
            id="ppc"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            placeholder="Cole aqui o texto extraído do PDF do PPC — ou use o botão acima para enviar o PDF."
            className={`${textareaCls} resize-y font-mono`}
          />
        </Field>
        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={analisar}
            disabled={loading || text.trim().length < 200}
          >
            {loading ? "Analisando com IA..." : "Analisar com IA"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {text.trim().length < 200
              ? "Cole pelo menos 200 caracteres."
              : `${text.length.toLocaleString("pt-BR")} caracteres`}
          </span>
        </div>
        {text.length > 250_000 && (
          <p className="text-xs text-warning">
            ⚠️ Texto longo: a IA usa só os primeiros ~250.000 caracteres. Se a
            parte técnica estiver no fim do PDF, apague o índice e a formação
            geral básica do começo, ou cole só os módulos técnicos.
          </p>
        )}
      </div>
    );
  }

  const totalUcs = draft.modules.reduce((n, m) => n + m.units.length, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
        Rascunho gerado: <strong>{draft.modules.length}</strong> módulo(s),{" "}
        <strong>{totalUcs}</strong> unidade(s) curricular(es). Revise e ajuste
        antes de salvar.
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nome do curso" htmlFor="c-name">
          <Input
            id="c-name"
            value={draft.name}
            onChange={(e) => patchCourse({ name: e.target.value })}
          />
        </Field>
        <Field label="Eixo" htmlFor="c-eixo">
          <Input
            id="c-eixo"
            value={draft.eixo ?? ""}
            onChange={(e) => patchCourse({ eixo: e.target.value })}
          />
        </Field>
        <Field label="Carga horária total (h)" htmlFor="c-ch">
          <Input
            id="c-ch"
            type="number"
            value={draft.carga_horaria_total ?? ""}
            onChange={(e) =>
              patchCourse({
                carga_horaria_total: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
          />
        </Field>
      </div>

      <div className="flex flex-col gap-4">
        {draft.modules.map((mod, mi) => (
          <div
            key={mi}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2">
              <input
                value={mod.name}
                onChange={(e) => patchModule(mi, { name: e.target.value })}
                className={`${textareaCls} font-semibold`}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeModule(mi)}
                title="Remover módulo"
              >
                ✕
              </Button>
            </div>

            <div className="flex flex-col gap-2 pl-2">
              {mod.units.map((u, ui) => (
                <details
                  key={ui}
                  className="rounded-lg border border-border bg-background/40"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="font-medium">
                      {u.title}
                      {u.carga_horaria_h ? ` · ${u.carga_horaria_h}h` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(u.capabilities?.length ?? 0)} hab. ·{" "}
                      {(u.knowledge?.length ?? 0)} conhec. ·{" "}
                      {(u.bibliography?.length ?? 0)} ref.
                    </span>
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                      <input
                        value={u.title}
                        onChange={(e) =>
                          patchUnit(mi, ui, { title: e.target.value })
                        }
                        className={textareaCls}
                      />
                      <input
                        type="number"
                        value={u.carga_horaria_h ?? ""}
                        placeholder="horas"
                        onChange={(e) =>
                          patchUnit(mi, ui, {
                            carga_horaria_h: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                        className={textareaCls}
                      />
                    </div>
                    <textarea
                      value={u.objetivo_geral ?? ""}
                      onChange={(e) =>
                        patchUnit(mi, ui, { objetivo_geral: e.target.value })
                      }
                      rows={2}
                      placeholder="Objetivo geral"
                      className={`${textareaCls} resize-y`}
                    />
                    {!!u.capabilities?.length && (
                      <div className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Habilidades:</strong>{" "}
                        {u.capabilities
                          .map((c) => (c.code ? `${c.code} ` : "") + c.description)
                          .join(" · ")}
                      </div>
                    )}
                    {!!u.knowledge?.length && (
                      <div className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Conhecimentos:</strong>{" "}
                        {u.knowledge.map((k) => k.text).join(" · ")}
                      </div>
                    )}
                    <div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeUnit(mi, ui)}
                      >
                        Remover esta UC
                      </Button>
                    </div>
                  </div>
                </details>
              ))}
              {!mod.units.length && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma UC neste módulo.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={salvar} disabled={saving}>
          {saving ? "Salvando..." : "Salvar curso"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setDraft(null)}
          disabled={saving}
        >
          Recomeçar
        </Button>
      </div>
    </div>
  );
}
