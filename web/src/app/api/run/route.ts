import type { NextRequest } from "next/server";
import * as z from "zod";

import { verifySession } from "@/lib/auth/dal";
import { getLanguage } from "@/lib/exercises/languages";
import { executeCode } from "@/lib/exercises/piston";

// Body esperado: { language, code, stdin? }
// `language` agora é um slug dinâmico (validado contra a tabela `languages`).
const RunSchema = z.object({
  language: z.string().min(1).max(40),
  code: z.string().min(1).max(50_000),
  stdin: z.string().max(10_000).optional().default(""),
});

// POST /api/run — executa um trecho de código no Piston (test run rápido).
// Não persiste nada. Pra submissão definitiva, use a Server Action `submitSolution`.
export async function POST(req: NextRequest) {
  await verifySession();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = RunSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  // Valida a linguagem contra o catálogo (tabela → fallback estático).
  const lang = await getLanguage(parsed.data.language);
  if (!lang || !lang.is_enabled || lang.runner !== "piston") {
    return Response.json(
      { error: `Linguagem não disponível para execução: ${parsed.data.language}` },
      { status: 400 },
    );
  }

  try {
    const result = await executeCode(parsed.data);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao executar";
    return Response.json({ error: message }, { status: 502 });
  }
}
