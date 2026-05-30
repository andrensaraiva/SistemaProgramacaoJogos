import type { NextRequest } from "next/server";
import * as z from "zod";

import { verifySession } from "@/lib/auth/dal";
import { aiAssist } from "@/lib/ai/assist";

// POST /api/ai/assist — tutor de IA no editor.
// Não persiste nada. Retorna { text } com explicação/dica (sem dar a solução).
const AssistSchema = z.object({
  mode: z.enum(["explain", "hint"]),
  language: z.string().min(1).max(40),
  exerciseTitle: z.string().min(1).max(200),
  exerciseDescription: z.string().max(8000).default(""),
  code: z.string().max(20_000).default(""),
  stderr: z.string().max(8000).optional(),
  stdout: z.string().max(8000).optional(),
  expected: z.string().max(8000).optional(),
});

export async function POST(req: NextRequest) {
  await verifySession();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = AssistSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  try {
    const text = await aiAssist(parsed.data);
    return Response.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha na IA";
    return Response.json({ error: message }, { status: 502 });
  }
}
