"use server";

import { createHmac } from "node:crypto";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { todayLocalISO } from "@/lib/gamification/streak";
import { createAdminClient } from "@/lib/supabase/admin";

import { ratingValido, ucEncerrada, type SurveyRatings } from "./eligibility";

// Pesquisa de UC — envio ANÔNIMO. Não guardamos student_id: só um dedupe_hash
// (HMAC com FEEDBACK_SECRET) pra impedir voto duplo sem revelar quem respondeu.
// Mesmo padrão do feedback do professor (ver [[co-docencia-feedback]]).

export type SurveyResult = { ok: boolean; message: string };

export type PesquisaPendente = {
  classUnitId: string;
  classId: string;
  turma: string;
  uc: string;
};

function dedupeHash(studentId: string, classUnitId: string): string {
  const secret = process.env.FEEDBACK_SECRET;
  if (!secret) throw new Error("FEEDBACK_SECRET ausente no servidor.");
  return createHmac("sha256", secret).update(`ucsurvey:${studentId}:${classUnitId}`).digest("hex");
}

/**
 * UCs encerradas (última aula já passou) das turmas do aluno que ele ainda NÃO
 * respondeu. Anônimo: checamos "já respondeu" pelo dedupe_hash, não por id.
 */
export async function getPesquisasPendentes(studentId: string): Promise<PesquisaPendente[]> {
  // Caminho de LEITURA no render do painel: se o segredo não estiver configurado,
  // não derruba a página — só esconde o widget (o envio, mais adiante, avisa).
  if (!process.env.FEEDBACK_SECRET) {
    console.warn("getPesquisasPendentes: FEEDBACK_SECRET ausente — pesquisas de UC desativadas.");
    return [];
  }

  const admin = createAdminClient();

  // Turmas do aluno.
  const { data: membros } = await admin
    .from("class_members")
    .select("class_id, class:classes!class_id(name)")
    .eq("student_id", studentId);
  const turmaIds = (membros ?? []).map((m) => m.class_id);
  if (turmaIds.length === 0) return [];
  const turmaNome = new Map(
    (membros ?? []).map((m) => [
      m.class_id,
      (m.class as unknown as { name: string } | null)?.name ?? "Turma",
    ]),
  );

  // UCs dessas turmas + as datas alocadas no calendário (pra saber se encerrou).
  const { data: cus } = await admin
    .from("class_units")
    .select("id, class_id, uc:curricular_units!uc_id(title)")
    .in("class_id", turmaIds);
  if (!cus || cus.length === 0) return [];
  const cuIds = cus.map((c) => c.id);

  const { data: dias } = await admin
    .from("calendar_days")
    .select("class_unit_id, date")
    .in("class_unit_id", cuIds);
  const datasPorUc = new Map<string, string[]>();
  for (const d of dias ?? []) {
    if (!d.class_unit_id) continue;
    const arr = datasPorUc.get(d.class_unit_id) ?? [];
    arr.push(d.date as string);
    datasPorUc.set(d.class_unit_id, arr);
  }

  const hoje = todayLocalISO();
  const encerradas = cus.filter((c) => ucEncerrada(datasPorUc.get(c.id) ?? [], hoje));
  if (encerradas.length === 0) return [];

  // Quais dessas o aluno já respondeu (por hash — sem revelar identidade).
  const hashes = encerradas.map((c) => dedupeHash(studentId, c.id));
  const { data: respondidas } = await admin
    .from("uc_survey_responses")
    .select("dedupe_hash")
    .in("dedupe_hash", hashes);
  const jaRespondeu = new Set((respondidas ?? []).map((r) => r.dedupe_hash));

  return encerradas
    .filter((c) => !jaRespondeu.has(dedupeHash(studentId, c.id)))
    .map((c) => ({
      classUnitId: c.id,
      classId: c.class_id,
      turma: turmaNome.get(c.class_id) ?? "Turma",
      uc: (c.uc as unknown as { title: string } | null)?.title ?? "UC",
    }));
}

/** Envia a pesquisa da UC (anônimo). Valida matrícula + UC encerrada + não-duplo. */
export async function responderPesquisa(
  classUnitId: string,
  ratings: SurveyRatings,
  comment: string,
): Promise<SurveyResult> {
  const { user } = await verifySession();
  if (!process.env.FEEDBACK_SECRET) {
    return { ok: false, message: "Pesquisa indisponível: FEEDBACK_SECRET não configurado no servidor." };
  }
  const admin = createAdminClient();

  // Valida notas.
  for (const v of Object.values(ratings)) {
    if (!ratingValido(v)) return { ok: false, message: "Nota inválida (use 1 a 5)." };
  }

  // A UC é de uma turma do aluno e está encerrada?
  const { data: cu } = await admin
    .from("class_units")
    .select("id, class_id")
    .eq("id", classUnitId)
    .single();
  if (!cu) return { ok: false, message: "UC não encontrada." };

  const { data: membership } = await admin
    .from("class_members")
    .select("student_id")
    .eq("class_id", cu.class_id)
    .eq("student_id", user.id)
    .maybeSingle();
  if (!membership) return { ok: false, message: "Você não está nesta turma." };

  const { data: dias } = await admin
    .from("calendar_days")
    .select("date")
    .eq("class_unit_id", classUnitId);
  const datas = (dias ?? []).map((d) => d.date as string);
  if (!ucEncerrada(datas, todayLocalISO())) {
    return { ok: false, message: "Esta UC ainda não terminou." };
  }

  // Insere anonimamente. dedupe_hash único impede voto duplo.
  const { error } = await admin.from("uc_survey_responses").insert({
    class_unit_id: classUnitId,
    rating_infra: ratings.infra,
    rating_didatica: ratings.didatica,
    rating_ritmo: ratings.ritmo,
    rating_geral: ratings.geral,
    comment: comment.trim() ? comment.trim().slice(0, 4000) : null,
    dedupe_hash: dedupeHash(user.id, classUnitId),
  });
  if (error) {
    // Violação de unique = já respondeu.
    if (error.code === "23505") return { ok: false, message: "Você já respondeu esta pesquisa." };
    return { ok: false, message: `Erro ao enviar: ${error.message}` };
  }

  revalidatePath("/painel");
  return { ok: true, message: "Pesquisa enviada anonimamente. Obrigado!" };
}
