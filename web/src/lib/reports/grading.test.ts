import { describe, expect, it } from "vitest";

import { DEFAULT_THRESHOLDS, situacao, situacaoLabel } from "./grading";

describe("situacao (regra de aprovação 0–10)", () => {
  it("sem nota → sem_nota", () => {
    expect(situacao(null, 90)).toBe("sem_nota");
    expect(situacao(null, null)).toBe("sem_nota");
  });

  it("aprovado: nota >= 6 e frequência >= 75", () => {
    expect(situacao(6.0, 75)).toBe("aprovado");
    expect(situacao(8.5, 100)).toBe("aprovado");
  });

  it("limite exato de nota 6.0 aprova; 5.9 é recuperação", () => {
    expect(situacao(6.0, 80)).toBe("aprovado");
    expect(situacao(5.9, 80)).toBe("recuperacao");
  });

  it("recuperação: 5.0 <= nota < 6.0 com frequência ok", () => {
    expect(situacao(5.0, 80)).toBe("recuperacao");
    expect(situacao(5.5, 75)).toBe("recuperacao");
  });

  it("reprovado por nota: < 5.0", () => {
    expect(situacao(4.9, 100)).toBe("reprovado");
    expect(situacao(0, 100)).toBe("reprovado");
  });

  it("reprovado por frequência mesmo com nota boa", () => {
    expect(situacao(9.0, 74)).toBe("reprovado");
    expect(situacao(6.0, 50)).toBe("reprovado");
  });

  it("limite exato de frequência 75 não reprova; 74 reprova", () => {
    expect(situacao(6.0, 75)).toBe("aprovado");
    expect(situacao(6.0, 74)).toBe("reprovado");
  });

  it("frequência null não reprova sozinha (sai pela nota)", () => {
    expect(situacao(7.0, null)).toBe("aprovado");
    expect(situacao(5.2, null)).toBe("recuperacao");
    expect(situacao(3.0, null)).toBe("reprovado");
  });

  it("respeita limiares customizados", () => {
    const t = { aprovacao: 7.0, recuperacaoMin: 6.0, freqMinPct: 80 };
    expect(situacao(6.9, 90, t)).toBe("recuperacao");
    expect(situacao(7.0, 90, t)).toBe("aprovado");
    expect(situacao(7.0, 79, t)).toBe("reprovado");
  });

  it("labels", () => {
    expect(situacaoLabel("aprovado")).toBe("Aprovado");
    expect(situacaoLabel("recuperacao")).toBe("Recuperação");
    expect(DEFAULT_THRESHOLDS.aprovacao).toBe(6.0);
  });
});
