// Catálogo declarativo dos blocos para a paleta do editor. Define categoria,
// cor (estilo Scratch) e como criar uma instância com valores padrão.

import type { Block } from "./types";

export type BlockType = Block["type"];

export type Category = {
  id: string;
  label: string;
  color: string; // tailwind bg/border via style inline
  blocks: { type: BlockType; label: string }[];
};

export const CATEGORIES: Category[] = [
  {
    id: "movimento",
    label: "Movimento",
    color: "#4c97ff",
    blocks: [
      { type: "mover", label: "mover ___ passos" },
      { type: "virar", label: "virar ___ graus" },
      { type: "ir_para", label: "ir para x:___ y:___" },
    ],
  },
  {
    id: "fala",
    label: "Aparência",
    color: "#9966ff",
    blocks: [
      { type: "falar", label: "falar ___" },
      { type: "imprimir", label: "imprimir ___ (console)" },
    ],
  },
  {
    id: "variaveis",
    label: "Variáveis",
    color: "#ff8c1a",
    blocks: [
      { type: "definir_var", label: "definir ___ = ___" },
      { type: "mudar_var", label: "mudar ___ em ___" },
    ],
  },
  {
    id: "listas",
    label: "Listas",
    color: "#ff661a",
    blocks: [
      { type: "criar_lista", label: "criar lista ___" },
      { type: "add_lista", label: "adicionar ___ à lista ___" },
    ],
  },
  {
    id: "controle",
    label: "Controle",
    color: "#ffab19",
    blocks: [
      { type: "repita", label: "repita ___ vezes" },
      { type: "enquanto", label: "enquanto ___" },
      { type: "se", label: "se ___ então / senão" },
    ],
  },
];

let counter = 0;
function newId(): string {
  counter += 1;
  return `blk-${Date.now().toString(36)}-${counter}`;
}

/** Cria um bloco com valores padrão (para a paleta adicionar à pilha). */
export function createBlock(type: BlockType): Block {
  const id = newId();
  switch (type) {
    case "mover":
      return { id, type, passos: { kind: "num", value: 10 } };
    case "virar":
      return { id, type, graus: { kind: "num", value: 15 } };
    case "ir_para":
      return { id, type, x: { kind: "num", value: 0 }, y: { kind: "num", value: 0 } };
    case "falar":
      return { id, type, texto: { kind: "text", value: "Olá!" } };
    case "imprimir":
      return { id, type, valor: { kind: "text", value: "Olá!" } };
    case "definir_var":
      return { id, type, name: "x", valor: { kind: "num", value: 0 } };
    case "mudar_var":
      return { id, type, name: "x", por: { kind: "num", value: 1 } };
    case "criar_lista":
      return { id, type, name: "lista" };
    case "add_lista":
      return { id, type, name: "lista", valor: { kind: "num", value: 0 } };
    case "se":
      return {
        id,
        type,
        cond: { kind: "op", op: ">", a: { kind: "num", value: 1 }, b: { kind: "num", value: 0 } },
        corpo: [],
        senao: [],
      };
    case "repita":
      return { id, type, vezes: { kind: "num", value: 4 }, corpo: [] };
    case "enquanto":
      return {
        id,
        type,
        cond: { kind: "op", op: "<", a: { kind: "var", name: "x" }, b: { kind: "num", value: 10 } },
        corpo: [],
      };
  }
}

/** Categoria (cor) de um tipo de bloco — para colorir na pilha. */
export function colorOf(type: BlockType): string {
  for (const c of CATEGORIES) {
    if (c.blocks.some((b) => b.type === type)) return c.color;
  }
  return "#7f8c8d";
}
