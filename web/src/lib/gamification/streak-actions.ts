import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { applyVisit, displayStreak, todayLocalISO, type StreakState } from "./streak";

export type StreakInfo = {
  /** Sequência exibível (já considera se esfriou). */
  atual: number;
  recorde: number;
  /** True se a visita de hoje acabou de incrementar a sequência. */
  cresceuHoje: boolean;
};

/**
 * Registra que o aluno apareceu hoje e devolve o streak atualizado.
 * Idempotente no dia: chamar várias vezes no mesmo dia não muda nada.
 * Datas em YYYY-MM-DD no fuso passado (default: servidor).
 */
export async function registrarVisita(
  studentId: string,
  current: number,
  longest: number,
  lastActiveOn: string | null,
  today: string = todayLocalISO(),
): Promise<StreakInfo> {
  const prev: StreakState = { current, longest, lastActiveOn };
  const next = applyVisit(prev, today);

  const cresceuHoje = next.current > prev.current && prev.lastActiveOn !== today;

  // Só grava se algo mudou (evita escrita à toa em recargas no mesmo dia).
  if (next !== prev) {
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({
        current_streak: next.current,
        longest_streak: next.longest,
        last_active_on: next.lastActiveOn,
      })
      .eq("id", studentId);
  }

  return {
    atual: displayStreak(next, today),
    recorde: next.longest,
    cresceuHoje,
  };
}
