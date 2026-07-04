"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  buildMissions,
  missionReward,
  type DailySignals,
  type MissionProgress,
} from "./missions";
import { displayStreak, todayLocalISO } from "./streak";

export type MissionClaimResult = { ok: true; coins: number } | { ok: false; message: string };

/** Sinais do dia do aluno + missões já resgatadas hoje. */
export async function getMissoesDoDia(
  studentId: string,
  streakState: { current: number; longest: number; lastActiveOn: string | null },
): Promise<MissionProgress[]> {
  const admin = createAdminClient();
  const hoje = todayLocalISO();
  const inicioDoDia = `${hoje}T00:00:00`;

  const [aprovadas, entregas, claims] = await Promise.all([
    admin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "aprovado")
      .gte("created_at", inicioDoDia),
    admin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "entregue")
      .gte("created_at", inicioDoDia),
    admin
      .from("daily_mission_claims")
      .select("mission_id")
      .eq("student_id", studentId)
      .eq("claim_date", hoje),
  ]);

  const signals: DailySignals = {
    aprovadosHoje: aprovadas.count ?? 0,
    entregasHoje: entregas.count ?? 0,
    streakAtual: displayStreak(streakState, hoje),
  };
  const claimedIds = new Set((claims.data ?? []).map((c) => c.mission_id));

  return buildMissions(signals, claimedIds);
}

/**
 * Resgata uma missão: credita as moedas (profiles.coins_bonus) uma única vez.
 * A unicidade é garantida pela PK (student, mission, date) — se já resgatou hoje,
 * o insert falha e não creditamos de novo. Revalida o progresso derivado no
 * servidor (não confia no cliente sobre estar completa).
 */
export async function resgatarMissao(missionId: string): Promise<MissionClaimResult> {
  const { user } = await verifySession();
  const admin = createAdminClient();
  const hoje = todayLocalISO();

  // Revalida no servidor que a missão está completa (não confia no cliente).
  const { data: prof } = await admin
    .from("profiles")
    .select("current_streak, longest_streak, last_active_on")
    .eq("id", user.id)
    .single();
  const missoes = await getMissoesDoDia(user.id, {
    current: prof?.current_streak ?? 0,
    longest: prof?.longest_streak ?? 0,
    lastActiveOn: prof?.last_active_on ?? null,
  });
  const alvo = missoes.find((m) => m.def.id === missionId);
  if (!alvo) return { ok: false, message: "Missão inválida." };
  if (!alvo.completed) return { ok: false, message: "Missão ainda não concluída." };
  if (alvo.claimed) return { ok: false, message: "Missão já resgatada hoje." };

  const reward = missionReward(missionId);

  // Registra o resgate (PK impede duplicar). Se conflitar, alguém já resgatou.
  const { error: claimErr } = await admin.from("daily_mission_claims").insert({
    student_id: user.id,
    mission_id: missionId,
    claim_date: hoje,
    reward,
  });
  if (claimErr) return { ok: false, message: "Missão já resgatada hoje." };

  // Credita as moedas.
  const { data: cur } = await admin
    .from("profiles")
    .select("coins_bonus")
    .eq("id", user.id)
    .single();
  await admin
    .from("profiles")
    .update({ coins_bonus: (cur?.coins_bonus ?? 0) + reward })
    .eq("id", user.id);

  revalidatePath("/painel");
  return { ok: true, coins: reward };
}
