import type { NextRequest } from "next/server";
import * as z from "zod";

import { isProfessor, verifySession } from "@/lib/auth/dal";
import { extractPpc } from "@/lib/ai/ppc";

// POST /api/ai/ppc — extrai a estrutura técnica de um PPC colado pelo professor.
// Não persiste nada: devolve um rascunho para revisão antes de gravar.
const PpcRequestSchema = z.object({
  text: z.string().min(200).max(200_000),
});

export async function POST(req: NextRequest) {
  await verifySession();
  if (!(await isProfessor())) {
    return Response.json(
      { error: "Apenas professores podem importar PPCs." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = PpcRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Cole o texto do PPC (mínimo de 200 caracteres)." },
      { status: 400 },
    );
  }

  try {
    const draft = await extractPpc(parsed.data.text);
    return Response.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao processar o PPC";
    return Response.json({ error: message }, { status: 502 });
  }
}
