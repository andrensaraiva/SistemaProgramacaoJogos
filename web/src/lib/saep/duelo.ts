"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

// -----------------------------------------------------------------------------
// Duelo de quiz (SAEP) — X1 de questões teóricas dentro da UC. Vence quem acerta
// mais (desempate por tempo). ELO contextual reusa duel_ratings (por UC), o mesmo
// ranking dos duelos de código. Posse verificada no código (admin client).
// -----------------------------------------------------------------------------

export type DueloResult = { ok: true; id?: string } | { ok: false; message: string };

const ELO_K = 32;
function elo(winnerRating: number, loserRating: number) {
  const expected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const delta = Math.round(ELO_K * (1 - expected));
  return { winnerDelta: delta, loserDelta: -delta };
}

async function isMember(classUnitId: string, userId: string) {
  const admin = createAdminClient();
  const { data: cu } = await admin
    .from("class_units")
    .select("class_id")
    .eq("id", classUnitId)
    .single();
  if (!cu) return false;
  const { data } = await admin
    .from("class_members")
    .select("student_id")
    .eq("class_id", cu.class_id)
    .eq("student_id", userId)
    .maybeSingle();
  return Boolean(data);
}

async function duelBackPath(admin: ReturnType<typeof createAdminClient>, classUnitId: string) {
  const { data: cu } = await admin
    .from("class_units")
    .select("class_id")
    .eq("id", classUnitId)
    .maybeSingle();
  return cu ? `/turmas/${cu.class_id}/ucs/${classUnitId}/duelos` : "/duelos";
}

// Cria o duelo: sorteia N questões do banco visíveis (do professor da turma ou
// públicas) e classificadas — preferindo as ligadas à matriz do curso da UC.
export async function criarDueloQuiz(
  classId: string,
  classUnitId: string,
  questionCount: number,
): Promise<DueloResult> {
  const { user } = await verifySession();
  if (!(await isMember(classUnitId, user.id)))
    return { ok: false, message: "Você não está nesta turma." };

  const n = Math.max(3, Math.min(10, Math.floor(questionCount) || 5));
  const admin = createAdminClient();

  // Dono da turma (autor das questões do banco da turma) + públicas.
  const { data: cu } = await admin
    .from("class_units")
    .select("class:classes!class_id(owner_id)")
    .eq("id", classUnitId)
    .single();
  const ownerId = (cu?.class as unknown as { owner_id: string } | undefined)?.owner_id;

  const { data: pool } = await admin
    .from("quiz_questions")
    .select("id")
    .or(`is_public.eq.true${ownerId ? `,author_id.eq.${ownerId}` : ""}`)
    .limit(200);
  const ids = (pool ?? []).map((q) => q.id);
  if (ids.length < n)
    return {
      ok: false,
      message: `Banco de questões insuficiente (precisa de ${n}, há ${ids.length}).`,
    };

  // Sorteio simples (Fisher-Yates parcial).
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const chosen = ids.slice(0, n);

  const { data: duel, error } = await admin
    .from("quiz_duels")
    .insert({ class_unit_id: classUnitId, challenger_id: user.id, question_count: n })
    .select("id")
    .single();
  if (error || !duel) return { ok: false, message: "Erro ao criar o duelo." };

  await admin.from("quiz_duel_questions").insert(
    chosen.map((qid, i) => ({ duel_id: duel.id, question_id: qid, ord: i })),
  );

  revalidatePath(`/turmas/${classId}/ucs/${classUnitId}/duelos`);
  return { ok: true, id: duel.id };
}

// Entra num duelo pelo código de convite.
export async function entrarNoDueloQuiz(inviteCode: string): Promise<DueloResult> {
  const { user } = await verifySession();
  const admin = createAdminClient();

  const { data: duel } = await admin
    .from("quiz_duels")
    .select("id, class_unit_id, challenger_id, opponent_id, status")
    .eq("invite_code", inviteCode.trim())
    .maybeSingle();
  if (!duel) return { ok: false, message: "Código de duelo inválido." };
  if (duel.challenger_id === user.id)
    return { ok: false, message: "Você é o desafiante deste duelo." };
  if (duel.opponent_id && duel.opponent_id !== user.id)
    return { ok: false, message: "Este duelo já tem oponente." };
  if (!(await isMember(duel.class_unit_id, user.id)))
    return { ok: false, message: "Você não está na turma deste duelo." };

  const { error } = await admin
    .from("quiz_duels")
    .update({ opponent_id: user.id, status: "em_andamento", started_at: new Date().toISOString() })
    .eq("id", duel.id);
  if (error) return { ok: false, message: error.message };

  const back = await duelBackPath(admin, duel.class_unit_id);
  revalidatePath(back);
  return { ok: true, id: duel.id };
}

// Envia as respostas do jogador, corrige, registra o finish e — quando ambos
// terminam — apura o vencedor e atualiza o ELO contextual (duel_ratings).
export async function responderDueloQuiz(
  duelId: string,
  answers: { question_id: string; option_id: string }[],
  totalMs: number,
): Promise<DueloResult> {
  const { user } = await verifySession();
  const admin = createAdminClient();

  const { data: duel } = await admin
    .from("quiz_duels")
    .select("id, class_unit_id, challenger_id, opponent_id, status")
    .eq("id", duelId)
    .single();
  if (!duel) return { ok: false, message: "Duelo não encontrado." };
  if (![duel.challenger_id, duel.opponent_id].includes(user.id))
    return { ok: false, message: "Você não participa deste duelo." };
  if (duel.status === "concluido") return { ok: false, message: "Duelo já concluído." };
  if (!duel.opponent_id) return { ok: false, message: "Aguardando oponente." };

  // Já enviou?
  const { data: existing } = await admin
    .from("quiz_duel_finishes")
    .select("player_id")
    .eq("duel_id", duelId)
    .eq("player_id", user.id)
    .maybeSingle();
  if (existing) return { ok: false, message: "Você já respondeu este duelo." };

  // Corrige contra o gabarito.
  const optionIds = answers.map((a) => a.option_id).filter(Boolean);
  const { data: opts } = optionIds.length
    ? await admin.from("quiz_options").select("id, is_correct").in("id", optionIds)
    : { data: [] };
  const correctById = new Map((opts ?? []).map((o) => [o.id, o.is_correct]));

  let correct = 0;
  const rows = answers.map((a) => {
    const isCorrect = a.option_id ? Boolean(correctById.get(a.option_id)) : false;
    if (isCorrect) correct += 1;
    return {
      duel_id: duelId,
      player_id: user.id,
      question_id: a.question_id,
      selected_option_id: a.option_id || null,
      is_correct: isCorrect,
    };
  });
  if (rows.length) await admin.from("quiz_duel_answers").insert(rows);
  await admin.from("quiz_duel_finishes").insert({
    duel_id: duelId,
    player_id: user.id,
    correct_count: correct,
    total_ms: Math.max(0, Math.round(totalMs)),
  });

  // Ambos terminaram? Apura.
  const { data: finishes } = await admin
    .from("quiz_duel_finishes")
    .select("player_id, correct_count, total_ms")
    .eq("duel_id", duelId);
  if ((finishes ?? []).length >= 2) {
    await resolverDuelo(admin, {
      id: duelId,
      class_unit_id: duel.class_unit_id,
      challenger_id: duel.challenger_id,
      opponent_id: duel.opponent_id,
      finishes: finishes ?? [],
    });
  }

  const back = await duelBackPath(admin, duel.class_unit_id);
  revalidatePath(back);
  return { ok: true, id: duelId };
}

async function resolverDuelo(
  admin: ReturnType<typeof createAdminClient>,
  d: {
    id: string;
    class_unit_id: string;
    challenger_id: string;
    opponent_id: string;
    finishes: { player_id: string; correct_count: number; total_ms: number | null }[];
  },
) {
  const ch = d.finishes.find((f) => f.player_id === d.challenger_id);
  const op = d.finishes.find((f) => f.player_id === d.opponent_id);
  if (!ch || !op) return;

  // Vencedor: mais acertos; desempate por menor tempo; senão empate (sem ELO).
  let winnerId: string | null = null;
  if (ch.correct_count !== op.correct_count) {
    winnerId = ch.correct_count > op.correct_count ? d.challenger_id : d.opponent_id;
  } else {
    const ct = ch.total_ms ?? Number.MAX_SAFE_INTEGER;
    const ot = op.total_ms ?? Number.MAX_SAFE_INTEGER;
    if (ct !== ot) winnerId = ct < ot ? d.challenger_id : d.opponent_id;
  }

  let ratingDelta: number | null = null;
  if (winnerId) {
    const loserId = winnerId === d.challenger_id ? d.opponent_id : d.challenger_id;
    const { data: ratings } = await admin
      .from("duel_ratings")
      .select("student_id, rating, wins, losses")
      .eq("class_unit_id", d.class_unit_id)
      .in("student_id", [winnerId, loserId]);
    const w = ratings?.find((r) => r.student_id === winnerId);
    const l = ratings?.find((r) => r.student_id === loserId);
    const wr = w?.rating ?? 1000;
    const lr = l?.rating ?? 1000;
    const { winnerDelta, loserDelta } = elo(wr, lr);
    ratingDelta = winnerDelta;

    await Promise.all([
      admin.from("duel_ratings").upsert(
        {
          student_id: winnerId,
          class_unit_id: d.class_unit_id,
          rating: wr + winnerDelta,
          wins: (w?.wins ?? 0) + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,class_unit_id" },
      ),
      admin.from("duel_ratings").upsert(
        {
          student_id: loserId,
          class_unit_id: d.class_unit_id,
          rating: lr + loserDelta,
          losses: (l?.losses ?? 0) + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,class_unit_id" },
      ),
    ]);
  }

  await admin
    .from("quiz_duels")
    .update({
      status: "concluido",
      winner_id: winnerId,
      challenger_correct: ch.correct_count,
      opponent_correct: op.correct_count,
      rating_delta: ratingDelta,
      ended_at: new Date().toISOString(),
    })
    .eq("id", d.id);
}

export async function cancelarDueloQuiz(duelId: string): Promise<DueloResult> {
  const { user } = await verifySession();
  const admin = createAdminClient();
  const { data: duel } = await admin
    .from("quiz_duels")
    .select("class_unit_id, challenger_id, status")
    .eq("id", duelId)
    .single();
  if (!duel) return { ok: false, message: "Duelo não encontrado." };
  if (duel.challenger_id !== user.id)
    return { ok: false, message: "Só o desafiante cancela." };
  if (duel.status !== "aguardando")
    return { ok: false, message: "Só dá para cancelar antes do oponente entrar." };

  await admin
    .from("quiz_duels")
    .update({ status: "cancelado", ended_at: new Date().toISOString() })
    .eq("id", duelId);

  const back = await duelBackPath(admin, duel.class_unit_id);
  revalidatePath(back);
  return { ok: true };
}
