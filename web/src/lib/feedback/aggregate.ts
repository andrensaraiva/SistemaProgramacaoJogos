// Agregação pura do feedback dos alunos (sem I/O) — testável isoladamente.
// Calcula média, total e distribuição de estrelas, e separa "geral" (sem aula)
// de "por aula". Não há autor: cada item é anônimo.

export type FeedbackItem = {
  rating: number; // 1..5
  comment: string | null;
  classUnitId: string | null;
  sessionId: string | null; // null = feedback geral (não amarrado a aula)
  createdAt: string;
};

export type FeedbackSummary = {
  total: number;
  average: number | null; // média das estrelas (1 casa)
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  geralCount: number; // feedbacks sem aula
  porAulaCount: number; // feedbacks amarrados a uma aula
  comments: { rating: number; comment: string; sessionId: string | null }[];
};

export function summarize(items: FeedbackItem[]): FeedbackSummary {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  let sum = 0;
  let geralCount = 0;
  let porAulaCount = 0;
  const comments: FeedbackSummary["comments"] = [];

  for (const it of items) {
    const r = Math.min(5, Math.max(1, Math.round(it.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[r] += 1;
    sum += r;
    if (it.sessionId) porAulaCount += 1;
    else geralCount += 1;
    if (it.comment && it.comment.trim()) {
      comments.push({ rating: r, comment: it.comment.trim(), sessionId: it.sessionId });
    }
  }

  const total = items.length;
  return {
    total,
    average: total > 0 ? Math.round((sum / total) * 10) / 10 : null,
    distribution,
    geralCount,
    porAulaCount,
    // comentários mais recentes primeiro (entrada já costuma vir ordenada; aqui
    // mantemos a ordem recebida, o caller decide a ordenação por created_at).
    comments,
  };
}

/** Média simples (para colunas de relatório), null se vazio. */
export function averageRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  const s = ratings.reduce((a, b) => a + b, 0);
  return Math.round((s / ratings.length) * 10) / 10;
}
