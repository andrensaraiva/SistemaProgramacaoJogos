// =============================================================================
// Missões diárias — lógica pura, testável.
// =============================================================================
// Metas do dia que dão MOEDAS ao completar. O progresso é DERIVADO da atividade
// do aluno no dia (submissões, entregas, ofensiva) — não inventamos tracking
// novo. Cada missão tem um alvo; quando o progresso alcança o alvo, a missão
// pode ser resgatada (uma vez por dia).

export type MissionId = "resolver" | "entregar" | "ofensiva";

export type MissionDef = {
  id: MissionId;
  title: string;
  description: string;
  emoji: string;
  /** Quantas vezes precisa fazer hoje. */
  target: number;
  /** Moedas ao completar. */
  reward: number;
};

export const DAILY_MISSIONS: MissionDef[] = [
  {
    id: "resolver",
    title: "Praticante do dia",
    description: "Tenha 1 exercício aprovado hoje",
    emoji: "💻",
    target: 1,
    reward: 5,
  },
  {
    id: "entregar",
    title: "Entregador",
    description: "Faça 1 entrega hoje",
    emoji: "📤",
    target: 1,
    reward: 5,
  },
  {
    id: "ofensiva",
    title: "Ofensiva viva",
    description: "Mantenha sua ofensiva diária 🔥",
    emoji: "🔥",
    target: 1,
    reward: 10,
  },
];

/** Sinais do dia usados pra medir o progresso das missões. */
export type DailySignals = {
  aprovadosHoje: number;
  entregasHoje: number;
  streakAtual: number;
};

export type MissionProgress = {
  def: MissionDef;
  progress: number;
  completed: boolean;
  claimed: boolean;
};

/** Progresso de uma missão a partir dos sinais do dia. */
export function missionProgressValue(id: MissionId, s: DailySignals): number {
  switch (id) {
    case "resolver":
      return s.aprovadosHoje;
    case "entregar":
      return s.entregasHoje;
    case "ofensiva":
      return s.streakAtual > 0 ? 1 : 0;
    default:
      return 0;
  }
}

/** Monta o estado de todas as missões do dia (progresso + resgatável). */
export function buildMissions(
  signals: DailySignals,
  claimedIds: Set<string>,
): MissionProgress[] {
  return DAILY_MISSIONS.map((def) => {
    const progress = Math.min(def.target, missionProgressValue(def.id, signals));
    return {
      def,
      progress,
      completed: progress >= def.target,
      claimed: claimedIds.has(def.id),
    };
  });
}

/** Uma missão só pode ser resgatada se está completa e ainda não foi resgatada. */
export function canClaim(mp: MissionProgress): boolean {
  return mp.completed && !mp.claimed;
}

/** Recompensa de uma missão pelo id (0 se id desconhecido). */
export function missionReward(id: string): number {
  return DAILY_MISSIONS.find((m) => m.id === id)?.reward ?? 0;
}
