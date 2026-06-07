// Modelo de dados dos blocos (estilo Scratch) — usado pelo editor e pelo
// interpretador puro. Um "valor" é literal (número/texto) ou referência a uma
// variável; expressões simples são operadores binários.

export type BlockValue =
  | { kind: "num"; value: number }
  | { kind: "text"; value: string }
  | { kind: "var"; name: string }
  | { kind: "op"; op: "+" | "-" | "*" | "/" | "=" | "<" | ">" | "e" | "ou"; a: BlockValue; b: BlockValue }
  | { kind: "list_item"; list: string; index: BlockValue }
  | { kind: "list_length"; list: string };

export type Block =
  // Movimento (palco)
  | { id: string; type: "mover"; passos: BlockValue }
  | { id: string; type: "virar"; graus: BlockValue }
  | { id: string; type: "ir_para"; x: BlockValue; y: BlockValue }
  // Falar (balão no palco + linha no console)
  | { id: string; type: "falar"; texto: BlockValue }
  | { id: string; type: "imprimir"; valor: BlockValue }
  // Variáveis
  | { id: string; type: "definir_var"; name: string; valor: BlockValue }
  | { id: string; type: "mudar_var"; name: string; por: BlockValue }
  // Listas
  | { id: string; type: "criar_lista"; name: string }
  | { id: string; type: "add_lista"; name: string; valor: BlockValue }
  // Controle (têm corpo)
  | { id: string; type: "se"; cond: BlockValue; corpo: Block[]; senao?: Block[] }
  | { id: string; type: "repita"; vezes: BlockValue; corpo: Block[] }
  | { id: string; type: "enquanto"; cond: BlockValue; corpo: Block[] };

export type BlocksProject = {
  kind: "blocos";
  width: number;
  height: number;
  blocks: Block[];
};

export type StageState = {
  x: number;
  y: number;
  dir: number; // graus, 0 = para a direita
  says: string | null;
};

export type RunResult = {
  console: string[];
  stage: StageState;
  steps: number;
  error?: string;
};

export function emptyBlocksProject(width: number, height: number): BlocksProject {
  return { kind: "blocos", width, height, blocks: [] };
}
