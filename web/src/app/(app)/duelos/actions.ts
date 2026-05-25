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
    .select("id, exercise_id, challenger_id, opponent_id, winner_id, started_at, status")
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

    const { data: players } = await admin
      .from("profiles")
      .select("id, duel_rating, duel_wins, duel_losses")
      .in("id", [winnerId, loserId]);

    const winner = players?.find((player) => player.id === winnerId);
    const loser = players?.find((player) => player.id === loserId);
    const winnerRating = winner?.duel_rating ?? 1000;
    const loserRating = loser?.duel_rating ?? 1000;
    const { winnerDelta, loserDelta } = calculateElo(
      winnerRating,
      loserRating,
    );
    const winnerRatingAfter = winnerRating + winnerDelta;
    const loserRatingAfter = loserRating + loserDelta;
    const challengerWon = winnerId === duel.challenger_id;

    await Promise.all([
      admin
        .from("profiles")
        .update({
          duel_rating: winnerRatingAfter,
          duel_wins: (winner?.duel_wins ?? 0) + 1,
        })
        .eq("id", winnerId),
      admin
        .from("profiles")
        .update({
          duel_rating: loserRatingAfter,
          duel_losses: (loser?.duel_losses ?? 0) + 1,
        })
        .eq("id", loserId),
    ]);

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

    const newWinCount = (winner?.duel_wins ?? 0) + 1;
    if (newWinCount >= 5) {
      await admin.from("user_badges").upsert({
        user_id: winnerId,
        badge_id: "duel_win_5",
      });
    }
  }

  revalidatePath("/duelos");
  redirect("/duelos");
}

export async function cancelDuel(formData: FormData) {
  const { user } = await verifySession();
  const duelId = formData.get("duel_id") as string;
  const admin = createAdminClient();

  await admin
    .from("duels")
    .update({ status: "cancelado", ended_at: new Date().toISOString() })
    .eq("id", duelId)
    .eq("challenger_id", user.id);

  revalidatePath("/duelos");
  redirect("/duelos");
}
