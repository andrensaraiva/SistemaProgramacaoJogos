import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// -----------------------------------------------------------------------------
// Registro central de linguagens.
//
// A fonte da verdade é a tabela `languages` no Supabase (migration 0005), mas
// mantemos um FALLBACK estático aqui para:
//   1. funcionar mesmo se a tabela ainda não foi migrada;
//   2. evitar um round-trip ao banco em caminhos quentes (executar código).
//
// `runner` decide COMO o código roda:
//   - 'piston'    → manda pro Piston (runtime/versão/arquivo definidos aqui)
//   - 'simulator' → caso especial (ex: Arduino) — ainda NÃO implementado
//   - 'none'      → não executável
// -----------------------------------------------------------------------------

export type LanguageRunner = "piston" | "simulator" | "none";

export type LanguageDef = {
  id: string;
  label: string;
  piston_runtime: string | null;
  piston_version: string;
  source_file: string;
  monaco_language: string;
  starter_code: string;
  runner: LanguageRunner;
  is_enabled: boolean;
  ord: number;
};

// Fallback usado quando a tabela `languages` não está disponível.
const FALLBACK_LANGUAGES: LanguageDef[] = [
  {
    id: "csharp",
    label: "C#",
    piston_runtime: "csharp.net",
    piston_version: "*",
    source_file: "main.cs",
    monaco_language: "csharp",
    starter_code:
      "using System;\n\nclass Program\n{\n    static void Main()\n    {\n        // seu código aqui\n    }\n}\n",
    runner: "piston",
    is_enabled: true,
    ord: 10,
  },
  {
    id: "python",
    label: "Python",
    piston_runtime: "python",
    piston_version: "*",
    source_file: "main.py",
    monaco_language: "python",
    starter_code: "# seu código aqui\n",
    runner: "piston",
    is_enabled: true,
    ord: 20,
  },
  {
    id: "javascript",
    label: "JavaScript",
    piston_runtime: "javascript",
    piston_version: "*",
    source_file: "main.js",
    monaco_language: "javascript",
    starter_code: "// seu código aqui\n",
    runner: "piston",
    is_enabled: true,
    ord: 30,
  },
  {
    id: "cpp",
    label: "C++",
    piston_runtime: "c++",
    piston_version: "*",
    source_file: "main.cpp",
    monaco_language: "cpp",
    starter_code:
      "#include <iostream>\nusing namespace std;\n\nint main() {\n    // seu código aqui\n    return 0;\n}\n",
    runner: "piston",
    is_enabled: true,
    ord: 40,
  },
  {
    id: "java",
    label: "Java",
    piston_runtime: "java",
    piston_version: "*",
    source_file: "Main.java",
    monaco_language: "java",
    starter_code:
      "public class Main {\n    public static void main(String[] args) {\n        // seu código aqui\n    }\n}\n",
    runner: "piston",
    is_enabled: true,
    ord: 50,
  },
  {
    id: "typescript",
    label: "TypeScript",
    piston_runtime: "typescript",
    piston_version: "*",
    source_file: "main.ts",
    monaco_language: "typescript",
    starter_code: "// seu código aqui\n",
    runner: "piston",
    is_enabled: true,
    ord: 60,
  },
];

const FALLBACK_BY_ID = new Map(FALLBACK_LANGUAGES.map((l) => [l.id, l]));

// Cache em memória do processo (curto). A lista de linguagens muda raramente.
let cache: { at: number; langs: LanguageDef[] } | null = null;
const CACHE_TTL_MS = 60_000;

/** Carrega todas as linguagens (tabela → fallback). Cacheado por 60s. */
export async function getLanguages(): Promise<LanguageDef[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.langs;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("languages")
      .select(
        "id, label, piston_runtime, piston_version, source_file, monaco_language, starter_code, runner, is_enabled, ord",
      )
      .order("ord", { ascending: true });

    if (error || !data || data.length === 0) {
      return FALLBACK_LANGUAGES;
    }

    const langs = data as LanguageDef[];
    cache = { at: Date.now(), langs };
    return langs;
  } catch {
    return FALLBACK_LANGUAGES;
  }
}

/** Apenas as linguagens habilitadas (para seletores na UI). */
export async function getEnabledLanguages(): Promise<LanguageDef[]> {
  return (await getLanguages()).filter((l) => l.is_enabled);
}

/** Resolve uma linguagem por id, sempre com fallback estático. */
export async function getLanguage(id: string): Promise<LanguageDef | null> {
  const all = await getLanguages();
  return all.find((l) => l.id === id) ?? FALLBACK_BY_ID.get(id) ?? null;
}

/** Resolução síncrona via fallback — para código que não pode aguardar I/O. */
export function getLanguageSyncFallback(id: string): LanguageDef | null {
  return FALLBACK_BY_ID.get(id) ?? null;
}
