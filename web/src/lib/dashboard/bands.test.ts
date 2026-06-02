import { describe, expect, it } from "vitest";

import { performanceBand } from "./bands";

describe("performanceBand", () => {
  it("null -> muted (sem dados)", () => {
    expect(performanceBand(null)).toBe("muted");
  });

  it("abaixo de 50% -> danger", () => {
    expect(performanceBand(0)).toBe("danger");
    expect(performanceBand(49)).toBe("danger");
  });

  it("50 a 69% -> warning", () => {
    expect(performanceBand(50)).toBe("warning");
    expect(performanceBand(69)).toBe("warning");
  });

  it("70% ou mais -> success", () => {
    expect(performanceBand(70)).toBe("success");
    expect(performanceBand(100)).toBe("success");
  });
});
