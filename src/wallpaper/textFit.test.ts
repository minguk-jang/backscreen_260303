import { describe, expect, it } from "vitest";
import { fitText } from "./textFit";

describe("fitText", () => {
  it("shrinks text size first and ellipsizes at min size", () => {
    const measure = (text: string, size: number) => text.length * size * 0.6;
    const result = fitText("아주아주긴문자열테스트", {
      maxWidth: 120,
      maxFont: 28,
      minFont: 14,
      measure
    });

    expect(result.fontSize).toBeGreaterThanOrEqual(14);
    expect(result.text.length).toBeGreaterThan(0);
    expect(measure(result.text, result.fontSize)).toBeLessThanOrEqual(120);
  });
});
