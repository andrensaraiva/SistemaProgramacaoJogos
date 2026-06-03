"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

import { verifySession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export type DuelFormState =
  | { errors?: Record<string, string[]>; message?: string }
  | undefined;

const CreateDuelSchema = z.object({
  exercise_id: z.string().uuid("Selecione um exercicio"),
});

const JoinDuelSchema = z.object({
  invite_code: z.string().min(1, "Informe o codigo").trim(),
});

const ELO_K_FACTOR = 32;

function calculateElo(winnerRating: number, loserRating: number) {
  const expectedWinner =
    1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const winnerDelta = Math.round(ELO_K_FACTOR * (1 - expectedWinner));

  return {
    winnerDelta,
    loserDelta: -winnerDelta,
  };
}

export async function createDuel(
  _prev: DuelFormState,
  formData: FormData,
): Promise<DuelFormState> {
  const { user } = await verifySession();
  const parsed = CreateDuelSchema.safeParse({
    exercise_id: formData.get("exercise_id"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("duels").insert({
    exercise_id: parsed.data.exercise_id,
    challenger_id: user.id,
  });

  if (error) return { message: error.message };

  revalidatePath("/duelos");
  redirect("/duelos");
}

// Duelo dentro de uma UC (turma × UC): exige class_unit_id e o desafiante
// precisa ser membro daquela UC. O ranking passa a ser contextual (duel_ratings).
const CreateDuelNaUcSchema = z.object({
  exercise_id: z.string().uuid("Selecione um exercicio"),
});

export async function createDuelNaUc(
  classId: string,
  classUnitId: string,
  _prev: DuelFormState,
  formData: FormData,
): Promise<DuelFormState> {
  const { user } = await verifySession();
  const parsed = CreateDuelNaUcSchema.safeParse({
    exercise_id: formData.get("exercise_id"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const admin = createAdminClient();

  // O desafiante precisa ser membro da turma do class_unit.
  const { data: cu } = await admin
    .from("class_units")
    .select("id, class_id")
    .eq("id", classUnitId)
    .single();
  if (!cu || cu.class_id !== classId) {
    return { message: "Unidade curricular invalida para esta turma." };
  }
  const { data: membership } = await admin
    .from("class_members")
    .select("student_id")
    .eq("class_id", classId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (!membership) {
    return { message: "Voce nao esta nesta turma." };
  }

  const { error } = await admin.from("duels").insert({
    exercise_id: parsed.data.exercise_id,
    challenger_id: user.id,
    class_unit_id: classUnitId,
  });
  if (error) return { message: error.message };

  revalidatePath(`/turmas/${classId}/ucs/${classUnitId}/duelos`);
  redirect(`/turmas/${classId}/ucs/${classUnitId}/duelos`);
}

export async function joinDuel(
  _prev: DuelFormState,
  formData: FormData,
): Promise<DuelFormState> {
  const { user } = await verifySession();
  const parsed = JoinDuelSchema.safeParse({
    invite_code: formData.get("invite_code"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const admin = createAdminClient();
  const { data: duel, error: findError } = await admin
    .from("duels")
    .select("id, challenger_id, opponent_id, status")
    .eq("invite_code", parsed.data.invite_code)
    .maybeSingle();

  if (findError || !duel) return { message: "Codigo de duelo invalido." };
  if (duel.challenger_id === user.id) {
    return { message: "Voce ja e o desafiante deste duelo." };
  }
  if (duel.opponent_id && duel.opponent_id !== user.id) {
    return { message: "Esse duelo ja tem oponente." };
  }

  const { error } = await admin
    .from("duels")
    .update({
      opponent_id: user.id,
      status: "em_andamento",
      started_at: new Date().toISOString(),
    })
    .eq("id", duel.id);

  if (error) return { message: error.message };

  revalidatePath("/duelos");
  redirect("/duelos");
}

export async function finishDuel(formData: FormData) {
  const { user } = await verifySession();
  const duelId = formData.get("duel_id") as string;
  const admin = createAdminClient();

  const { data: duel } = await admin
    .from("duels")
    .select(
      "id, exercise_id, challenger_id, opponent_id, winner_id, started_at, status, class_unit_id",
    )
    .eq("id", duelId)
    .single();

  if (
    !duel ||
    !duel.opponent_id ||
    duel.status === "concluido" ||
    duel.winner_id ||
    ![duel.challenger_id, duel.opponent_id].includes(user.id)
  ) {
    redirect("/duelos");
  }

  const startedAt = duel.started_at ?? new Date(0).toISOString();
  const { data: submissions } = await admin
    .from("submissions")
    .select("student_id, created_at")
    .eq("exercise_id", duel.exercise_id)
    .eq("status", "aprovado")
    .in("student_id", [duel.challenger_id, duel.opponent_id])
    .gte("created_at", startedAt)
    .order("created_at", { ascending: true })
    .limit(1);

  const winnerId = submissions?.[0]?.student_id ?? null;
  if (winnerId) {
    const loserId =
      winnerId === duel.challenger_id ? duel.opponent_id : duel.challenger_id;

    // Ratings ANTES: contextual (duel_ratings por UC) quando o duelo tem UC;
    // senão o rating global (profiles) — duelos legados.
    const classUnitId = duel.class_unit_id as string | null;
    let winnerRating = 1000;
    let loserRating = 1000;
    let winnerWins = 0;
    let loserLosses = 0;

    if (classUnitId) {
      const { data: ratings } = await admin
        .from("duel_ratings")
        .select("student_id, rating, wins, losses")
        .eq("class_unit_id", classUnitId)
        .in("student_id", [winnerId, loserId]);
      const w = ratings?.find((r) => r.student_id === winnerId);
      const l = ratings?.find((r) => r.student_id === loserId);
      winnerRating = w?.rating ?? 1000;
      loserRating = l?.rating ?? 1000;
      winnerWins = w?.wins ?? 0;
      loserLosses = l?.losses ?? 0;
    } else {
      const { data: players } = await admin
        .from("profiles")
        .select("id, duel_rating, duel_wins, duel_losses")
        .in("id", [winnerId, loserId]);
      const w = players?.find((p) => p.id === winnerId);
      const l = players?.find((p) => p.id === loserId);
      winnerRating = w?.duel_rating ?? 1000;
      loserRating = l?.duel_rating ?? 1000;
      winnerWins = w?.duel_wins ?? 0;
      loserLosses = l?.duel_losses ?? 0;
    }

    const { winnerDelta, loserDelta } = calculateElo(winnerRating, loserRating);
    const winnerRatingAfter = winnerRating + winnerDelta;
    const loserRatingAfter = loserRating + loserDelta;
    const challengerWon = winnerId === duel.challenger_id;

    if (classUnitId) {
      await Promise.all([
        admin.from("duel_ratings").upsert(
          {
            student_id: winnerId,
            class_unit_id: classUnitId,
            rating: winnerRatingAfter,
            wins: winnerWins + 1,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id,class_unit_id" },
        ),
        admin.from("duel_ratings").upsert(
          {
            student_id: loserId,
            class_unit_id: classUnitId,
            rating: loserRatingAfter,
            losses: loserLosses + 1,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id,class_unit_id" },
        ),
      ]);
    } else {
      await Promise.all([
        admin
          .from("profiles")
          .update({ duel_rating: winnerRatingAfter, duel_wins: winnerWins + 1 })
          .eq("id", winnerId),
        admin
          .from("profiles")
          .update({ duel_rating: loserRatingAfter, duel_losses: loserLosses + 1 })
          .eq("id", loserId),
      ]);
    }

    await admin
      .from("duels")
      .update({
        winner_id: winnerId,
        status: "concluido",
        ended_at: new Date().toISOString(),
        challenger_rating_before: challengerWon ? winnerRating : loserRating,
        challenger_rating_after: challengerWon
          ? winnerRatingAfter
          : loserRatingAfter,
        opponent_rating_before: challengerWon ? loserRating : winnerRating,
        opponent_rating_after: challengerWon
          ? loserRatingAfter
          : winnerRatingAfter,
        rating_delta: winnerDelta,
      })
      .eq("id", duel.id);

    const newWinCount = winnerWins + 1;
    if (newWinCount >= 5) {
      await admin.from("user_badges").upsert({
        user_id: winnerId,
        badge_id: "duel_win_5",
      });
    }
  }

  // Volta para o contexto: a UC do duelo (se houver) ou a tela global de duelos.
  const back = await duelBackPath(admin, duel.class_unit_id as string | null);
  revalidatePath(back);
  redirect(back);
}

// Resolve o caminho de volta de um duelo: turmas/[id]/ucs/[cu]/duelos quando o
// duelo pertence a uma UC, senão /duelos (legado/global).
async function duelBackPath(
  admin: ReturnType<typeof createAdminClient>,
  classUnitId: string | null,
): Promise<string> {
  if (!classUnitId) return "/duelos";
  const { data: cu } = await admin
    .from("class_units")
    .select("class_id")
    .eq("id", classUnitId)
    .maybeSingle();
  if (!cu) return "/duelos";
  return `/turmas/${cu.class_id}/ucs/${classUnitId}/duelos`;
}

export async function cancelDuel(formData: FormData) {
  const { user } = await verifySession();
  const duelId = formData.get("duel_id") as string;
  const admin = createAdminClient();

  const { data: duel } = await admin
    .from("duels")
    .select("class_unit_id")
    .eq("id", duelId)
    .maybeSingle();

  await admin
    .from("duels")
    .update({ status: "cancelado", ended_at: new Date().toISOString() })
    .eq("id", duelId)
    .eq("challenger_id", user.id);

  const back = await duelBackPath(admin, duel?.class_unit_id as string | null);
  revalidatePath(back);
  redirect(back);
}
