// Regra pura de situação acadêmica por UC (sem I/O) — testável isoladamente.
//
// Escala de NOTA: 0–10 (bate com manual_grade e com o chart que usa `>= 6`).
// Regra (padrão SENAI, limiares configuráveis em institution_settings):
//   - sem_nota:     não há nota lançada ainda;
//   - reprovado:    nota < recuperacaoMin  OU  frequência < freqMinPct;
//   - recuperacao:  recuperacaoMin <= nota < aprovacao  (e frequência ok);
//   - aprovado:     nota >= aprovacao  E  frequência >= freqMinPct.
// Frequência null (sem aulas lançadas) NÃO reprova sozinha — só conta quando há
// registro; nesse caso a situação sai pela nota.

export type Situacao = "aprovado" | "recuperacao" | "reprovado" | "sem_nota";

export type Thresholds = {
  aprovacao: number; // nota mínima para aprovar (ex.: 6.0)
  recuperacaoMin: number; // nota mínima para recuperação (ex.: 5.0)
  freqMinPct: number; // frequência mínima em % (ex.: 75)
};

export const DEFAULT_THRESHOLDS: Thresholds = {
  aprovacao: 6.0,
  recuperacaoMin: 5.0,
  freqMinPct: 75,
};

export function situacao(
  media0a10: number | null,
  freqPct: number | null,
  t: Thresholds = DEFAULT_THRESHOLDS,
): Situacao {
  if (media0a10 == null) return "sem_nota";

  // Frequência reprova quando há registro e está abaixo do mínimo.
  const reprovaPorFreq = freqPct != null && freqPct < t.freqMinPct;
  if (reprovaPorFreq) return "reprovado";

  if (media0a10 < t.recuperacaoMin) return "reprovado";
  if (media0a10 < t.aprovacao) return "recuperacao";
  return "aprovado";
}

/** Rótulo legível em PT-BR para exibição/CSV. */
export function situacaoLabel(s: Situacao): string {
  switch (s) {
    case "aprovado":
      return "Aprovado";
    case "recuperacao":
      return "Recuperação";
    case "reprovado":
      return "Reprovado";
    case "sem_nota":
      return "Sem nota";
  }
}

/** Tom para badges/cores do kit de UI. */
export function situacaoTone(s: Situacao): "success" | "warning" | "danger" | "default" {
  switch (s) {
    case "aprovado":
      return "success";
    case "recuperacao":
      return "warning";
    case "reprovado":
      return "danger";
    case "sem_nota":
      return "default";
  }
}
