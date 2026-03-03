import { describe, expect, it } from "vitest";
import { limitItems } from "./sectionCapacity";

describe("limitItems", () => {
  it("returns visible items and hidden count", () => {
    const { visible, hidden } = limitItems(["a", "b", "c", "d"], 2);
    expect(visible).toEqual(["a", "b"]);
    expect(hidden).toBe(2);
  });
});
