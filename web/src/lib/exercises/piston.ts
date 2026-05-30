import "server-only";

import { getLanguage, getLanguageSyncFallback } from "./languages";
import type { RunResult } from "./types";

// Executa código em uma das linguagens do catálogo (tabela `languages`).
// Veja: https://github.com/engineer-man/piston (lista de runtimes)

type ExecuteParams = {
  // Aceita o id da linguagem (slug). Compatível com os valores antigos do enum
  // ('csharp' | 'python' | 'javascript') e com os novos ('cpp', 'java'...).
  language: string;
  code: string;
  stdin?: string;
};

// Resposta crua do Piston em /execute
type PistonResponse = {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number | null;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number | null;
    signal: string | null;
    output: string;
  };
};

const PISTON_BASE =
  process.env.PISTON_API_URL ?? "https://emkc.org/api/v2/piston";

export async function executeCode({
  language,
  code,
  stdin = "",
}: ExecuteParams): Promise<RunResult> {
  // Resolve a linguagem (tabela → fallback estático).
  const lang =
    (await getLanguage(language)) ?? getLanguageSyncFallback(language);

  if (!lang) {
    throw new Error(`Linguagem desconhecida: ${language}`);
  }

  if (lang.runner === "simulator") {
    // Arduino e afins ainda não rodam aqui — ver docs/ARDUINO_PLANO.md.
    throw new Error(
      `A linguagem "${lang.label}" usa um runner especial ainda não disponível.`,
    );
  }

  if (lang.runner !== "piston" || !lang.piston_runtime) {
    throw new Error(`A linguagem "${lang.label}" não é executável.`);
  }

  const res = await fetch(`${PISTON_BASE}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: lang.piston_runtime,
      version: lang.piston_version || "*",
      files: [{ name: lang.source_file, content: code }],
      stdin,
      compile_timeout: 10_000,
      run_timeout: 3_000,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Piston respondeu ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as PistonResponse;

  // Erro de compilação: junta stderr da compilação no stderr final
  const compileErr = data.compile?.stderr?.trim();
  const stderr = compileErr
    ? `${compileErr}\n${data.run.stderr}`.trim()
    : data.run.stderr;

  return {
    stdout: data.run.stdout ?? "",
    stderr,
    exit_code: data.run.code ?? -1,
    timed_out: data.run.signal === "SIGKILL",
    language_version: data.version,
  };
}
