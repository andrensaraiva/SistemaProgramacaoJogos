import { describe, expect, it } from "vitest";

import { montarLinhaDoTempo, type Bloco, type Sessao } from "./uc-timeline";

const bloco = (id: string, ord: number, ini: number, fim: number): Bloco => ({
  id,
  title: `Bloco ${id}`,
  conteudo: `conteudo ${id}`,
  apresentacaoUrl: null,
  aulaInicio: ini,
  aulaFim: fim,
  ord,
});

describe("montarLinhaDoTempo", () => {
  it("anexa o bloco do plano pela faixa de aulas", () => {
    const sessions: Sessao[] = [
      { sessionNumber: 1, date: "2026-02-02", label: "Lógica" },
      { sessionNumber: 13, date: "2026-03-02", label: "OO" },
    ];
    const blocks = [bloco("A", 0, 1, 12), bloco("B", 1, 13, 24)];
    const t = montarLinhaDoTempo(sessions, [], blocks);
    expect(t[0].bloco?.id).toBe("A"); // aula 1 → bloco A
    expect(t[1].bloco?.id).toBe("B"); // aula 13 → bloco B
  });

  it("ordena por data (mais antiga primeiro)", () => {
    const sessions: Sessao[] = [
      { sessionNumber: 2, date: "2026-02-05", label: null },
      { sessionNumber: 1, date: "2026-02-02", label: null },
    ];
    const t = montarLinhaDoTempo(sessions, [], []);
    expect(t.map((x) => x.date)).toEqual(["2026-02-02", "2026-02-05"]);
  });

  it("inclui datas do calendário sem sessão correspondente", () => {
    const sessions: Sessao[] = [{ sessionNumber: 1, date: "2026-02-02", label: null }];
    const cal = [{ date: "2026-02-02" }, { date: "2026-02-09" }];
    const t = montarLinhaDoTempo(sessions, cal, []);
    // 02/02 já tem sessão (não duplica); 09/02 entra como aula só-data.
    expect(t).toHaveLength(2);
    const nova = t.find((x) => x.date === "2026-02-09")!;
    expect(nova.sessionNumber).toBeNull();
    expect(nova.bloco).toBeNull();
  });

  it("aula sem bloco correspondente fica com bloco null", () => {
    const t = montarLinhaDoTempo([{ sessionNumber: 99, date: "2026-05-01", label: null }], [], [bloco("A", 0, 1, 12)]);
    expect(t[0].bloco).toBeNull();
  });

  it("sem plano e sem sessão → lista vazia", () => {
    expect(montarLinhaDoTempo([], [], [])).toEqual([]);
  });
});
