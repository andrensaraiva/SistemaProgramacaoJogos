import type { NextRequest } from "next/server";
import * as z from "zod";

import { aiSuggestGrade } from "@/lib/ai/grade";
import { getProfile } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAcessoTurma } from "@/lib/turmas/access";

// POST /api/ai/grade — sugere nota + feedback para o professor corrigir.
// NÃO grava nada; só devolve a sugestão. Exige que quem chama GERENCIE a turma
// da submissão (dono/co-docente/coordenador/admin).
const Schema = z.object({ submissionId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const profile = await getProfile();
  if (!profile) return Response.json({ error: "Sessão inválida" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "submissionId inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("submissions")
    .select(
      "code, response_text, submission_link, passed_count, total_count, exercise:exercises!exercise_id(title, description, exercise_type, response_template, example), assignment:assignments!assignment_id(class_id, class:classes!class_id(owner_id))",
    )
    .eq("id", parsed.data.submissionId)
    .single();
  if (!sub) return Response.json({ error: "Submissão não encontrada" }, { status: 404 });

  const assignment = sub.assignment as unknown as {
    class_id: string;
    class: { owner_id: string };
  };
  const { podeGerenciar } = await getAcessoTurma(
    assignment.class_id,
    profile,
    assignment.class.owner_id,
  );
  if (!podeGerenciar) {
    return Response.json({ error: "Sem permissão" }, { status: 403 });
  }

  const exercise = sub.exercise as unknown as {
    title: string;
    description: string;
    exercise_type: string | null;
    response_template: string | null;
    example: string | null;
  };

  // A "entrega" varia por tipo: código, texto ou o link.
  const submission =
    sub.code || sub.response_text || sub.submission_link || "(sem conteúdo textual)";

  try {
    const suggestion = await aiSuggestGrade({
      kind: exercise.exercise_type ?? "codigo",
      exerciseTitle: exercise.title,
      exerciseDescription: exercise.description,
      responseTemplate: exercise.response_template ?? undefined,
      example: exercise.example ?? undefined,
      submission,
      passed: sub.passed_count ?? undefined,
      total: sub.total_count ?? undefined,
    });
    return Response.json(suggestion);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha na IA";
    return Response.json({ error: message }, { status: 502 });
  }
}
