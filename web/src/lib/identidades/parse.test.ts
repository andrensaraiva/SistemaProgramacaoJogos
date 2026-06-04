import { describe, expect, it } from "vitest";

import {
  canonicalEmail,
  generateTempPassword,
  isValidEmail,
  normalizeEmail,
  parseStudentsText,
} from "./parse";

describe("isValidEmail", () => {
  it("aceita emails válidos", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail("  joao.silva@escola.edu.br ")).toBe(true);
  });
  it("rejeita inválidos", () => {
    expect(isValidEmail("semarroba")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a @b.com")).toBe(false);
  });
});

describe("normalizeEmail / canonicalEmail", () => {
  it("normaliza para lower+trim e trata vazio", () => {
    expect(normalizeEmail("  JOAO@X.com ")).toBe("joao@x.com");
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
  });
  it("canônico é o institucional quando existe, senão o pessoal", () => {
    expect(
      canonicalEmail({ institutionalEmail: "i@x.com", personalEmail: "p@y.com" }),
    ).toBe("i@x.com");
    expect(
      canonicalEmail({ institutionalEmail: null, personalEmail: "p@y.com" }),
    ).toBe("p@y.com");
    expect(
      canonicalEmail({ institutionalEmail: null, personalEmail: null }),
    ).toBeNull();
  });
});

describe("parseStudentsText", () => {
  it("faz parse de linhas válidas com 2 emails", () => {
    const { rows, errors } = parseStudentsText(
      "Ana Souza, ana@escola.br, ana.pessoal@gmail.com\nBruno Lima; bruno@escola.br",
    );
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      displayName: "Ana Souza",
      institutionalEmail: "ana@escola.br",
      personalEmail: "ana.pessoal@gmail.com",
    });
    expect(rows[1].personalEmail).toBeNull();
  });

  it("ignora linhas em branco", () => {
    const { rows } = parseStudentsText("\n\nAna, ana@x.com\n\n");
    expect(rows).toHaveLength(1);
  });

  it("aceita tab e ponto-e-vírgula como separador", () => {
    const { rows, errors } = parseStudentsText("Ana\tana@x.com\tana@gmail.com");
    expect(errors).toHaveLength(0);
    expect(rows[0].institutionalEmail).toBe("ana@x.com");
  });

  it("exige nome", () => {
    const { errors } = parseStudentsText("a, a@x.com");
    expect(errors[0].message).toMatch(/Nome obrigatório/);
  });

  it("exige ao menos um email", () => {
    const { errors } = parseStudentsText("Ana Sem Email");
    expect(errors[0].message).toMatch(/ao menos um email/);
  });

  it("rejeita email inválido", () => {
    const { errors } = parseStudentsText("Ana, naoehemail");
    expect(errors[0].message).toMatch(/Email inválido/);
  });

  it("detecta duplicado dentro do lote (entre institucional e pessoal também)", () => {
    const { errors } = parseStudentsText(
      "Ana, ana@x.com\nBruno, outro@x.com, ana@x.com",
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(2);
    expect(errors[0].message).toMatch(/duplicado/);
  });

  it("reporta a linha original mesmo com brancos no meio", () => {
    const { errors } = parseStudentsText("Ana, ana@x.com\n\nb, ruim");
    expect(errors[0].line).toBe(3);
  });
});

describe("generateTempPassword", () => {
  it("tem o tamanho pedido e usa só o alfabeto seguro", () => {
    const pw = generateTempPassword(12);
    expect(pw).toHaveLength(12);
    // Alfabeto seguro: sem O, 0, I, l, 1.
    expect(pw).toMatch(/^[A-HJ-NP-Za-km-z2-9]+$/);
  });
  it("não repete trivialmente (duas chamadas diferem)", () => {
    expect(generateTempPassword()).not.toBe(generateTempPassword());
  });
});
