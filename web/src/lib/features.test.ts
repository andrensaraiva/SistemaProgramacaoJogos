import { describe, expect, it } from "vitest";

import { FEATURES, getNavGroups, isCoordenadorAllowedPath } from "./features";

describe("registro de features (navegação)", () => {
  it("aluno vê a área de aluno (painel, exercícios, duelos, ranking)", () => {
    const ids = getNavGroups("aluno").flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain("painel");
    expect(ids).toContain("exercicios");
    expect(ids).toContain("duelos");
    expect(ids).toContain("ranking");
    expect(ids).not.toContain("prof-exercicios"); // rótulo do professor
    expect(ids).not.toContain("turmas"); // professor
    expect(ids).not.toContain("saep"); // professor
    expect(ids).not.toContain("admin"); // admin
  });

  it("professor: gestão de turma + 'Meus exercícios', SEM duelos/ranking", () => {
    const items = getNavGroups("professor").flatMap((g) => g.items);
    const ids = items.map((i) => i.id);
    expect(ids).toContain("painel");
    expect(ids).toContain("prof-exercicios");
    expect(ids).toContain("turmas");
    expect(ids).toContain("saep");
    expect(ids).toContain("cursos");
    // Cortados do professor:
    expect(ids).not.toContain("duelos");
    expect(ids).not.toContain("ranking");
    expect(ids).not.toContain("exercicios"); // o rótulo "Exercícios" é do aluno
    expect(ids).not.toContain("admin");
    // O item do professor leva à mesma rota e tem o rótulo certo.
    const ex = items.find((i) => i.id === "prof-exercicios")!;
    expect(ex.href).toBe("/exercicios");
    expect(ex.label).toBe("Meus exercícios");
  });

  it("admin é enxuto: vê só itens 'admin'", () => {
    const groups = getNavGroups("admin");
    const ids = groups.flatMap((g) => g.items.map((i) => i.id));
    // Nada de aluno/professor.
    expect(ids).not.toContain("exercicios");
    expect(ids).not.toContain("painel");
    expect(ids).not.toContain("turmas");
    expect(ids).not.toContain("saep");
    // Só Administração.
    expect(ids).toContain("admin");
    expect(ids).toContain("admin-cursos");
    expect(groups.every((g) => g.title === "Administração")).toBe(true);
  });

  it("coordenador é gestão: vê Coordenação, não vê área de aluno", () => {
    const groups = getNavGroups("coordenador");
    const ids = groups.flatMap((g) => g.items.map((i) => i.id));
    // Nada de aluno.
    expect(ids).not.toContain("exercicios");
    expect(ids).not.toContain("painel");
    expect(ids).not.toContain("duelos");
    // Itens de coordenação.
    expect(ids).toContain("coord-painel");
    expect(ids).toContain("coord-turmas");
    expect(ids).toContain("coord-salas");
    expect(ids).toContain("coord-relatorios");
    // Não vê itens 'admin'.
    expect(ids).not.toContain("admin");
  });

  it("isCoordenadorAllowedPath libera gestão e bloqueia área de aluno", () => {
    expect(isCoordenadorAllowedPath("/coordenador")).toBe(true);
    expect(isCoordenadorAllowedPath("/turmas/123/calendario")).toBe(true);
    expect(isCoordenadorAllowedPath("/salas/ocupacao")).toBe(true);
    expect(isCoordenadorAllowedPath("/admin/relatorios/turmas")).toBe(true);
    expect(isCoordenadorAllowedPath("/exercicios")).toBe(false);
    expect(isCoordenadorAllowedPath("/duelos")).toBe(false);
    expect(isCoordenadorAllowedPath("/admin")).toBe(false); // não é admin
  });

  it("features desabilitadas somem do menu", () => {
    const original = FEATURES.find((f) => f.id === "saep")!;
    const prev = original.enabled;
    original.enabled = false;
    try {
      const ids = getNavGroups("professor").flatMap((g) => g.items.map((i) => i.id));
      expect(ids).not.toContain("saep");
    } finally {
      original.enabled = prev; // não vaza para outros testes
    }
  });

  it("não retorna grupos vazios", () => {
    for (const role of ["aluno", "professor", "admin", "coordenador"] as const) {
      for (const g of getNavGroups(role)) {
        expect(g.items.length).toBeGreaterThan(0);
      }
    }
  });
});
