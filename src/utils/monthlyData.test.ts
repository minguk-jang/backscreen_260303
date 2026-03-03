import { describe, expect, it } from "vitest";
import { upsertMealByDate } from "./monthlyData";

describe("upsertMealByDate", () => {
  it("overwrites existing meal with same date", () => {
    const next = upsertMealByDate(
      [{ id: "1", date: "2026-03-03", items: ["A"] }],
      { id: "2", date: "2026-03-03", items: ["B"] }
    );
    expect(next).toHaveLength(1);
    expect(next[0].items).toEqual(["B"]);
  });
});
