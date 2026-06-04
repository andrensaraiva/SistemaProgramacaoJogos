import { describe, expect, it } from "vitest";

import { FEATURES, getNavGroups } from "./features";

describe("registro de features (navegação)", () => {
  it("aluno não vê features professorOnly", () => {
    const groups = getNavGroups(false);
    const ids = groups.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).not.toContain("saep"); // professorOnly
    expect(ids).not.toContain("cursos"); // professorOnly
    expect(ids).toContain("exercicios");
  });

  it("professor vê as features professorOnly", () => {
    const ids = getNavGroups(true).flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain("saep");
    expect(ids).toContain("cursos");
  });

  it("features desabilitadas somem do menu", () => {
    const original = FEATURES.find((f) => f.id === "unity")!;
    const prev = original.enabled;
    original.enabled = false;
    try {
      const ids = getNavGroups(true).flatMap((g) => g.items.map((i) => i.id));
      expect(ids).not.toContain("unity");
    } finally {
      original.enabled = prev; // não vaza para outros testes
    }
  });

  it("só admin vê features adminOnly", () => {
    const profIds = getNavGroups(true, false).flatMap((g) => g.items.map((i) => i.id));
    expect(profIds).not.toContain("admin");
    const adminIds = getNavGroups(true, true).flatMap((g) => g.items.map((i) => i.id));
    expect(adminIds).toContain("admin");
  });

  it("não retorna grupos vazios", () => {
    for (const g of getNavGroups(false)) {
      expect(g.items.length).toBeGreaterThan(0);
    }
  });
});
