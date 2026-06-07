// Interpretador puro dos blocos (sem DOM/IO) — testável e base de auto-correção.
// Executa o programa com limite de passos (anti-loop-infinito).

import type { Block, BlockValue, BlocksProject, RunResult, StageState } from "./types";

const MAX_STEPS = 10_000;

type Env = {
  vars: Map<string, number | string>;
  lists: Map<string, (number | string)[]>;
  console: string[];
  stage: StageState;
  steps: number;
};

function toNum(v: number | string): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function truthy(v: number | string): boolean {
  if (typeof v === "number") return v !== 0;
  return v !== "" && v !== "false" && v !== "0";
}

function evalValue(v: BlockValue, env: Env): number | string {
  switch (v.kind) {
    case "num":
      return v.value;
    case "text":
      return v.value;
    case "var":
      return env.vars.get(v.name) ?? 0;
    case "list_length":
      return (env.lists.get(v.list) ?? []).length;
    case "list_item": {
      const list = env.lists.get(v.list) ?? [];
      // Índice 1-based (estilo Scratch).
      const i = Math.trunc(toNum(evalValue(v.index, env))) - 1;
      return list[i] ?? 0;
    }
    case "op": {
      const a = evalValue(v.a, env);
      const b = evalValue(v.b, env);
      switch (v.op) {
        case "+":
          return toNum(a) + toNum(b);
        case "-":
          return toNum(a) - toNum(b);
        case "*":
          return toNum(a) * toNum(b);
        case "/":
          return toNum(b) === 0 ? 0 : toNum(a) / toNum(b);
        case "=":
          return String(a) === String(b) ? 1 : 0;
        case "<":
          return toNum(a) < toNum(b) ? 1 : 0;
        case ">":
          return toNum(a) > toNum(b) ? 1 : 0;
        case "e":
          return truthy(a) && truthy(b) ? 1 : 0;
        case "ou":
          return truthy(a) || truthy(b) ? 1 : 0;
      }
    }
  }
}

function tick(env: Env) {
  env.steps += 1;
  if (env.steps > MAX_STEPS) {
    throw new Error("Limite de passos atingido (possível repetição infinita).");
  }
}

function runBlocks(blocks: Block[], env: Env) {
  for (const b of blocks) {
    tick(env);
    switch (b.type) {
      case "mover": {
        const passos = toNum(evalValue(b.passos, env));
        const rad = (env.stage.dir * Math.PI) / 180;
        env.stage.x += Math.round(Math.cos(rad) * passos);
        env.stage.y += Math.round(Math.sin(rad) * passos);
        break;
      }
      case "virar":
        env.stage.dir = (env.stage.dir + toNum(evalValue(b.graus, env))) % 360;
        break;
      case "ir_para":
        env.stage.x = toNum(evalValue(b.x, env));
        env.stage.y = toNum(evalValue(b.y, env));
        break;
      case "falar":
        env.stage.says = String(evalValue(b.texto, env));
        env.console.push(env.stage.says);
        break;
      case "imprimir":
        env.console.push(String(evalValue(b.valor, env)));
        break;
      case "definir_var":
        env.vars.set(b.name, evalValue(b.valor, env));
        break;
      case "mudar_var":
        env.vars.set(b.name, toNum(env.vars.get(b.name) ?? 0) + toNum(evalValue(b.por, env)));
        break;
      case "criar_lista":
        if (!env.lists.has(b.name)) env.lists.set(b.name, []);
        break;
      case "add_lista": {
        const list = env.lists.get(b.name) ?? [];
        list.push(evalValue(b.valor, env));
        env.lists.set(b.name, list);
        break;
      }
      case "se":
        if (truthy(evalValue(b.cond, env))) runBlocks(b.corpo, env);
        else if (b.senao) runBlocks(b.senao, env);
        break;
      case "repita": {
        const n = Math.max(0, Math.trunc(toNum(evalValue(b.vezes, env))));
        for (let i = 0; i < n; i++) {
          tick(env);
          runBlocks(b.corpo, env);
        }
        break;
      }
      case "enquanto":
        while (truthy(evalValue(b.cond, env))) {
          tick(env);
          runBlocks(b.corpo, env);
        }
        break;
    }
  }
}

export function runProgram(project: BlocksProject): RunResult {
  const env: Env = {
    vars: new Map(),
    lists: new Map(),
    console: [],
    stage: { x: 0, y: 0, dir: 0, says: null },
    steps: 0,
  };
  try {
    runBlocks(project.blocks, env);
    return { console: env.console, stage: env.stage, steps: env.steps };
  } catch (e) {
    return {
      console: env.console,
      stage: env.stage,
      steps: env.steps,
      error: e instanceof Error ? e.message : "Erro ao executar.",
    };
  }
}
