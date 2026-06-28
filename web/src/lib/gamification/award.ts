import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { levelFromXp } from "./reward-xp";

/**
 * Concede `amount` de XP a uma submissão de ENTREGA (não-código), de forma
 * idempotente: usa submissions.xp_awarded/xp_processed_at como marcador para não
 * pagar duas vezes pela mesma fonte. Atualiza profiles.xp/level.
 *
 * `desired` é o XP que ESTA submissão deveria ter concedido no total (entrega +
 * mérito acumulado). Pagamos só o delta vs. o que já foi concedido (xp_awarded),
 * então re-corrigir a nota ajusta o XP sem duplicar.
 *
 * Não mexe no caminho de código (esse é tratado pelo trigger no banco).
 */
export async function awardDeliveryXp(
  submissionId: string,
  studentId: string,
  desired: number,
): Promise<number> {
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("submissions")
    .select("xp_awarded")
    .eq("id", submissionId)
    .single();
  const already = sub?.xp_awarded ?? 0;
  const delta = desired - already;

  // Sempre registra o total na submissão (mesmo delta 0 mantém consistência).
  await admin
    .from("submissions")
    .update({ xp_awarded: desired, xp_processed_at: new Date().toISOString() })
    .eq("id", submissionId);

  if (delta === 0) return 0;

  // Aplica o delta no perfil e recalcula o nível.
  const { data: prof } = await admin
    .from("profiles")
    .select("xp")
    .eq("id", studentId)
    .single();
  const novoXp = Math.max(0, (prof?.xp ?? 0) + delta);
  await admin
    .from("profiles")
    .update({ xp: novoXp, level: levelFromXp(novoXp) })
    .eq("id", studentId);

  return delta;
}
