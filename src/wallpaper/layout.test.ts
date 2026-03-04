import { describe, expect, it } from "vitest";
import { computeLayout } from "./layout";

describe("computeLayout", () => {
  it("reserves 12% left and 8% top safe area", () => {
    const layout = computeLayout(1920, 1080);
    expect(layout.safe.left).toBeCloseTo(230.4, 1);
    expect(layout.safe.top).toBeCloseTo(86.4, 1);
    expect(layout.content.x).toBeGreaterThanOrEqual(layout.safe.left);
    expect(layout.content.y).toBeCloseTo(layout.safe.top, 1);
  });

  it("keeps content inside viewport on large scale", () => {
    const layout = computeLayout(1366, 768, 1.3);
    expect(layout.content.x).toBeGreaterThanOrEqual(0);
    expect(layout.content.y).toBeGreaterThanOrEqual(0);
    expect(layout.content.x + layout.content.w).toBeLessThanOrEqual(1366);
    expect(layout.content.y + layout.content.h).toBeLessThanOrEqual(768);
  });

  it("applies offset movement and still clamps inside viewport", () => {
    const layout = computeLayout(1366, 768, 0.5, 100, -100);
    expect(layout.content.x).toBeGreaterThanOrEqual(0);
    expect(layout.content.y).toBeGreaterThanOrEqual(0);
    expect(layout.content.x + layout.content.w).toBeLessThanOrEqual(1366);
    expect(layout.content.y + layout.content.h).toBeLessThanOrEqual(768);
  });
});
