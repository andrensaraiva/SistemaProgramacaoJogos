import { describe, expect, it } from "vitest";

import {
  buildMissions,
  canClaim,
  DAILY_MISSIONS,
  missionProgressValue,
  missionReward,
  type DailySignals,
} from "./missions";

const zero: DailySignals = { aprovadosHoje: 0, entregasHoje: 0, streakAtual: 0 };

describe("missionProgressValue", () => {
  it("resolver conta aprovados do dia", () => {
    expect(missionProgressValue("resolver", { ...zero, aprovadosHoje: 2 })).toBe(2);
  });
  it("entregar conta entregas do dia", () => {
    expect(missionProgressValue("entregar", { ...zero, entregasHoje: 1 })).toBe(1);
  });
  it("ofensiva é 1 se streak > 0, senão 0", () => {
    expect(missionProgressValue("ofensiva", { ...zero, streakAtual: 5 })).toBe(1);
    expect(missionProgressValue("ofensiva", zero)).toBe(0);
  });
});

describe("buildMissions", () => {
  it("marca completa quando o progresso alcança o alvo", () => {
    const ms = buildMissions({ aprovadosHoje: 1, entregasHoje: 0, streakAtual: 3 }, new Set());
    const resolver = ms.find((m) => m.def.id === "resolver")!;
    const entregar = ms.find((m) => m.def.id === "entregar")!;
    const ofensiva = ms.find((m) => m.def.id === "ofensiva")!;
    expect(resolver.completed).toBe(true);
    expect(entregar.completed).toBe(false);
    expect(ofensiva.completed).toBe(true);
  });

  it("limita o progresso ao alvo", () => {
    const ms = buildMissions({ ...zero, aprovadosHoje: 9 }, new Set());
    expect(ms.find((m) => m.def.id === "resolver")!.progress).toBe(1);
  });

  it("marca resgatada quando o id está no set", () => {
    const ms = buildMissions({ aprovadosHoje: 1, entregasHoje: 0, streakAtual: 0 }, new Set(["resolver"]));
    expect(ms.find((m) => m.def.id === "resolver")!.claimed).toBe(true);
  });
});

describe("canClaim", () => {
  it("só resgata missão completa e não resgatada", () => {
    const [m] = buildMissions({ ...zero, aprovadosHoje: 1 }, new Set());
    expect(canClaim(m)).toBe(true);
    const [claimed] = buildMissions({ ...zero, aprovadosHoje: 1 }, new Set(["resolver"]));
    expect(canClaim(claimed)).toBe(false);
    const [incomplete] = buildMissions(zero, new Set());
    expect(canClaim(incomplete)).toBe(false);
  });
});

describe("missionReward", () => {
  it("devolve a recompensa da missão", () => {
    expect(missionReward("ofensiva")).toBe(10);
    expect(missionReward("resolver")).toBe(5);
    expect(missionReward("xpto")).toBe(0);
  });
});

describe("DAILY_MISSIONS", () => {
  it("tem ids únicos", () => {
    const ids = DAILY_MISSIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
