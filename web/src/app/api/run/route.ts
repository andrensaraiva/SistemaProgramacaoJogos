import type { NextRequest } from "next/server";
import * as z from "zod";

import { verifySession } from "@/lib/auth/dal";
import { executeCode } from "@/lib/exercises/piston";

// Body esperado: { language, code, stdin? }
const RunSchema = z.object({
  language: z.enum(["csharp", "python", "javascript"]),
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

  try {
    const result = await executeCode(parsed.data);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao executar";
    return Response.json({ error: message }, { status: 502 });
  }
}
