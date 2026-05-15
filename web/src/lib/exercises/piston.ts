import "server-only";

import type { Language, RunResult } from "./types";

// Mapeia nossas linguagens internas pros runtimes que a API pública do Piston usa.
// Veja: https://github.com/engineer-man/piston (lista de runtimes)
const PISTON_LANGUAGE: Record<Language, { language: string; file: string }> = {
  csharp: { language: "csharp.net", file: "main.cs" },
  python: { language: "python", file: "main.py" },
  javascript: { language: "javascript", file: "main.js" },
};

type ExecuteParams = {
  language: Language;
  code: string;
  stdin?: string;
};

// Resposta crua do Piston em /api/v2/piston/execute
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
  const config = PISTON_LANGUAGE[language];

  const res = await fetch(`${PISTON_BASE}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: config.language,
      version: "*",
      files: [{ name: config.file, content: code }],
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
