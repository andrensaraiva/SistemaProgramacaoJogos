import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Cria notificações in-app (sino). Helper server-side reusável — NÃO é uma
// server action (por isso vive fora de actions.ts), pode ser chamado de dentro
// de outras actions. Falhas são silenciosas: notificação é secundária ao fluxo.

const BADGE_LABEL: Record<string, string> = {
  first_green: "Primeira Vitória",
  no_paste: "Mão Própria",
  streak_7: "Semana Consistente",
};

/** Notifica o aluno sobre conquistas desbloqueadas (uma notificação por badge). */
export async function notificarConquistas(
  studentId: string,
  badgeIds: string[],
): Promise<void> {
  if (badgeIds.length === 0) return;
  const admin = createAdminClient();
  const rows = badgeIds.map((id) => ({
    recipient_id: studentId,
    type: "conquista",
    title: "🏅 Nova conquista!",
    body: `Você desbloqueou "${BADGE_LABEL[id] ?? id}". Veja no seu perfil.`,
    link: "/perfil",
  }));
  await admin.from("notifications").insert(rows);
}

/** Notifica o aluno que subiu de nível. */
export async function notificarNivel(studentId: string, level: number): Promise<void> {
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    recipient_id: studentId,
    type: "nivel",
    title: `🆙 Você chegou ao nível ${level}!`,
    body: "Continue assim — mais moedas e cosméticos te esperam na loja.",
    link: "/perfil",
  });
}
