// =============================================================================
// Elegibilidade da pesquisa de UC — lógica pura, testável.
// =============================================================================
// A pesquisa abre AUTOMATICAMENTE quando a UC termina: a última data alocada
// daquela UC no calendário já passou. Datas em YYYY-MM-DD (sem fuso), como no
// resto do projeto (calendário/streak).

/** A UC terminou? True se a última aula (maior data) é anterior a hoje. */
export function ucEncerrada(datasDaUc: string[], hoje: string): boolean {
  if (datasDaUc.length === 0) return false;
  const ultima = datasDaUc.reduce((a, b) => (a > b ? a : b));
  return ultima < hoje;
}

export type SurveyTopic = "infra" | "didatica" | "ritmo" | "geral";

export type SurveyTopicDef = {
  id: SurveyTopic;
  label: string;
  hint: string;
  emoji: string;
};

// Tópicos avaliados (1–5). Fonte única — adicionar tópico = uma entrada aqui.
export const SURVEY_TOPICS: SurveyTopicDef[] = [
  { id: "infra", label: "Infraestrutura", hint: "sala, computadores, equipamentos", emoji: "🏫" },
  { id: "didatica", label: "Didática das aulas", hint: "clareza e método do professor", emoji: "🧑‍🏫" },
  { id: "ritmo", label: "Ritmo e carga", hint: "velocidade e volume de conteúdo", emoji: "⏱️" },
  { id: "geral", label: "Satisfação geral", hint: "como foi a UC no todo", emoji: "⭐" },
];

/** Uma nota é válida se ausente (null) ou 1–5. */
export function ratingValido(v: number | null | undefined): boolean {
  return v == null || (Number.isInteger(v) && v >= 1 && v <= 5);
}

export type SurveyRatings = Record<SurveyTopic, number | null>;

/** Média dos tópicos preenchidos (ignora null). Null se nenhum preenchido. */
export function mediaTopicos(ratings: SurveyRatings): number | null {
  const vals = SURVEY_TOPICS.map((t) => ratings[t.id]).filter(
    (v): v is number => v != null,
  );
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}
