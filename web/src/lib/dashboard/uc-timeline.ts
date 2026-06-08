// Linha do tempo de aulas de uma UC (puro, sem I/O) — para o aluno revisar.
// Cruza as aulas (attendance_sessions: número + data + label; e datas do
// calendário) com os blocos do plano de ensino (faixa aula_inicio..aula_fim),
// anexando o conteúdo do bloco a cada aula. Sem inventar dado: onde faltar
// plano ou sessão, mostra o que existir.

export type Sessao = {
  sessionNumber: number;
  date: string | null; // YYYY-MM-DD
  label: string | null;
};

export type CalendarDia = {
  date: string; // YYYY-MM-DD
};

export type Bloco = {
  id: string;
  title: string;
  conteudo: string | null;
  apresentacaoUrl: string | null;
  aulaInicio: number | null;
  aulaFim: number | null;
  ord: number;
};

export type AulaTimeline = {
  key: string;
  sessionNumber: number | null;
  date: string | null;
  label: string | null;
  bloco: Bloco | null; // bloco do plano que cobre esta aula
};

/** Acha o bloco cuja faixa [aulaInicio, aulaFim] cobre o número da aula. */
function blocoDaAula(n: number | null, blocks: Bloco[]): Bloco | null {
  if (n == null) return null;
  for (const b of blocks) {
    const ini = b.aulaInicio ?? 1;
    const fim = b.aulaFim ?? Number.MAX_SAFE_INTEGER;
    if (n >= ini && n <= fim) return b;
  }
  return null;
}

/**
 * Monta a linha do tempo. Base: as sessões de frequência (têm número e data).
 * As datas do calendário que NÃO têm sessão correspondente entram como aulas
 * "sem número" (só data). Tudo ordenado por data (sem data vai ao fim).
 */
export function montarLinhaDoTempo(
  sessions: Sessao[],
  calendarDias: CalendarDia[],
  blocks: Bloco[],
): AulaTimeline[] {
  const ordenarBlocos = [...blocks].sort((a, b) => a.ord - b.ord);

  const itens: AulaTimeline[] = sessions.map((s) => ({
    key: `s${s.sessionNumber}`,
    sessionNumber: s.sessionNumber,
    date: s.date,
    label: s.label,
    bloco: blocoDaAula(s.sessionNumber, ordenarBlocos),
  }));

  // Datas do calendário sem sessão na mesma data → aula só com data.
  const datasComSessao = new Set(sessions.map((s) => s.date).filter(Boolean));
  for (const d of calendarDias) {
    if (datasComSessao.has(d.date)) continue;
    itens.push({ key: `c${d.date}`, sessionNumber: null, date: d.date, label: null, bloco: null });
  }

  // Ordena por data asc (nulos por último), depois por número de aula.
  itens.sort((a, b) => {
    if (a.date && b.date) return a.date.localeCompare(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0);
  });

  return itens;
}
