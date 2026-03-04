import { describe, expect, it } from "vitest";
import { parseMealDocumentText } from "./mealImportParser";

describe("parseMealDocumentText", () => {
  it("parses date-grouped meal lines from extracted text", () => {
    const text = "3월 4일\n기장밥\n콩나물국\n3월 5일\n잡곡밥\n미역국";
    const meals = parseMealDocumentText(text, "2026-03");

    expect(meals).toHaveLength(2);
    expect(meals[0].date).toBe("2026-03-04");
    expect(meals[0].items).toContain("기장밥");
  });

  it("returns empty list when no date token exists", () => {
    const meals = parseMealDocumentText("급식표\n기장밥\n콩나물국", "2026-03");
    expect(meals).toEqual([]);
  });
});
