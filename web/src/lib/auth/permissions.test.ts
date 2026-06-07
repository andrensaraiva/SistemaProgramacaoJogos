import { describe, expect, it } from "vitest";

import { homeDe, pode, type Capability } from "./permissions";

describe("pode (matriz de capacidades)", () => {
  it("aluno só vê a área de aluno", () => {
    expect(pode("aluno", "ver_area_aluno")).toBe(true);
    expect(pode("aluno", "ver_relatorios")).toBe(false);
    expect(pode("aluno", "gerenciar_turma")).toBe(false);
  });

  it("professor gerencia turma e usa área de aluno, mas não relatórios institucionais", () => {
    expect(pode("professor", "gerenciar_turma")).toBe(true);
    expect(pode("professor", "cadastrar_aluno")).toBe(true);
    expect(pode("professor", "montar_calendario")).toBe(true);
    expect(pode("professor", "ver_area_aluno")).toBe(true);
    expect(pode("professor", "ver_relatorios")).toBe(false);
    expect(pode("professor", "gerenciar_contas")).toBe(false);
  });

  it("coordenador supervisiona, vê relatórios e gerencia salas/feriados — sem área de aluno nem contas", () => {
    expect(pode("coordenador", "supervisionar_turmas")).toBe(true);
    expect(pode("coordenador", "gerenciar_turma")).toBe(true);
    expect(pode("coordenador", "ver_relatorios")).toBe(true);
    expect(pode("coordenador", "gerenciar_salas")).toBe(true);
    expect(pode("coordenador", "gerenciar_feriados")).toBe(true);
    expect(pode("coordenador", "ver_area_aluno")).toBe(false);
    expect(pode("coordenador", "gerenciar_contas")).toBe(false);
  });

  it("admin gerencia contas/config/relatórios — não é área de aluno nem gestão de turma", () => {
    expect(pode("admin", "gerenciar_contas")).toBe(true);
    expect(pode("admin", "gerenciar_config")).toBe(true);
    expect(pode("admin", "ver_relatorios")).toBe(true);
    expect(pode("admin", "gerenciar_salas")).toBe(true);
    expect(pode("admin", "ver_area_aluno")).toBe(false);
    expect(pode("admin", "gerenciar_turma")).toBe(false);
  });

  it("gerenciar_admins só com flag master", () => {
    expect(pode("admin", "gerenciar_admins")).toBe(false);
    expect(pode("admin", "gerenciar_admins", { isMaster: true })).toBe(true);
    // master não é papel: coordenador com flag não vira gestor de admins
    expect(pode("coordenador", "gerenciar_admins", { isMaster: true })).toBe(false);
  });

  it("capacidade desconhecida para o papel → false", () => {
    expect(pode("aluno", "gerenciar_admins" as Capability)).toBe(false);
  });
});

describe("homeDe", () => {
  it("mapeia a home de cada papel", () => {
    expect(homeDe("admin")).toBe("/admin");
    expect(homeDe("coordenador")).toBe("/coordenador");
    expect(homeDe("professor")).toBe("/painel");
    expect(homeDe("aluno")).toBe("/painel");
  });
});
