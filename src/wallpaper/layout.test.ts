import { describe, expect, it } from "vitest";
import { computeLayout } from "./layout";

describe("computeLayout", () => {
  it("reserves 12% left and 8% top safe area", () => {
    const layout = computeLayout(1920, 1080);
    expect(layout.safe.left).toBeCloseTo(230.4, 1);
    expect(layout.safe.top).toBeCloseTo(86.4, 1);
    expect(layout.content.x).toBeGreaterThanOrEqual(layout.safe.left);
    expect(layout.content.y).toBeGreaterThanOrEqual(layout.safe.top);
  });
});
