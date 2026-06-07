import { describe, expect, it } from "vitest";

import { runProgram } from "./runtime";
import type { Block, BlockValue, BlocksProject } from "./types";

const num = (n: number): BlockValue => ({ kind: "num", value: n });
const text = (s: string): BlockValue => ({ kind: "text", value: s });
const v = (name: string): BlockValue => ({ kind: "var", name });

function prog(blocks: Block[]): BlocksProject {
  return { kind: "blocos", width: 480, height: 360, blocks };
}

let idc = 0;
const id = () => `b${idc++}`;

describe("runProgram", () => {
  it("imprime texto no console", () => {
    const r = runProgram(prog([{ id: id(), type: "imprimir", valor: text("Oi") }]));
    expect(r.console).toEqual(["Oi"]);
    expect(r.error).toBeUndefined();
  });

  it("falar coloca no balão e no console", () => {
    const r = runProgram(prog([{ id: id(), type: "falar", texto: text("Olá!") }]));
    expect(r.stage.says).toBe("Olá!");
    expect(r.console).toEqual(["Olá!"]);
  });

  it("variável: definir e mudar", () => {
    const r = runProgram(
      prog([
        { id: id(), type: "definir_var", name: "x", valor: num(5) },
        { id: id(), type: "mudar_var", name: "x", por: num(3) },
        { id: id(), type: "imprimir", valor: v("x") },
      ]),
    );
    expect(r.console).toEqual(["8"]);
  });

  it("repita N imprime contador 1..3", () => {
    const r = runProgram(
      prog([
        { id: id(), type: "definir_var", name: "i", valor: num(0) },
        {
          id: id(),
          type: "repita",
          vezes: num(3),
          corpo: [
            { id: id(), type: "mudar_var", name: "i", por: num(1) },
            { id: id(), type: "imprimir", valor: v("i") },
          ],
        },
      ]),
    );
    expect(r.console).toEqual(["1", "2", "3"]);
  });

  it("se/senão escolhe o ramo certo", () => {
    const cond: BlockValue = { kind: "op", op: ">", a: num(5), b: num(2) };
    const r = runProgram(
      prog([
        {
          id: id(),
          type: "se",
          cond,
          corpo: [{ id: id(), type: "imprimir", valor: text("maior") }],
          senao: [{ id: id(), type: "imprimir", valor: text("menor") }],
        },
      ]),
    );
    expect(r.console).toEqual(["maior"]);
  });

  it("lista: criar, adicionar, item e tamanho", () => {
    const r = runProgram(
      prog([
        { id: id(), type: "criar_lista", name: "nums" },
        { id: id(), type: "add_lista", name: "nums", valor: num(10) },
        { id: id(), type: "add_lista", name: "nums", valor: num(20) },
        { id: id(), type: "imprimir", valor: { kind: "list_item", list: "nums", index: num(2) } },
        { id: id(), type: "imprimir", valor: { kind: "list_length", list: "nums" } },
      ]),
    );
    expect(r.console).toEqual(["20", "2"]);
  });

  it("enquanto soma até 3", () => {
    const cond: BlockValue = { kind: "op", op: "<", a: v("i"), b: num(3) };
    const r = runProgram(
      prog([
        { id: id(), type: "definir_var", name: "i", valor: num(0) },
        {
          id: id(),
          type: "enquanto",
          cond,
          corpo: [{ id: id(), type: "mudar_var", name: "i", por: num(1) }],
        },
        { id: id(), type: "imprimir", valor: v("i") },
      ]),
    );
    expect(r.console).toEqual(["3"]);
  });

  it("movimento: mover na direção 0 anda em x", () => {
    const r = runProgram(prog([{ id: id(), type: "mover", passos: num(10) }]));
    expect(r.stage.x).toBe(10);
    expect(r.stage.y).toBe(0);
  });

  it("guarda contra loop infinito (erro, não trava)", () => {
    const r = runProgram(
      prog([
        {
          id: id(),
          type: "enquanto",
          cond: num(1), // sempre verdadeiro
          corpo: [{ id: id(), type: "mudar_var", name: "x", por: num(1) }],
        },
      ]),
    );
    expect(r.error).toMatch(/repetição infinita|Limite de passos/i);
  });

  it("divisão por zero não quebra (retorna 0)", () => {
    const val: BlockValue = { kind: "op", op: "/", a: num(5), b: num(0) };
    const r = runProgram(prog([{ id: id(), type: "imprimir", valor: val }]));
    expect(r.console).toEqual(["0"]);
  });
});
