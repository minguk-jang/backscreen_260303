import { describe, expect, it, vi } from "vitest";
import { defaultState } from "../defaults";
import type { AppState } from "../types";
import { mergeWithDefaults } from "./state";

describe("mergeWithDefaults", () => {
  it("fills missing nested fields while preserving provided values", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-08T09:00:00.000Z"));

    const incoming = {
      schoolInfo: {
        schoolName: "테스트학교"
      },
      timetable: {
        mon: [
          {
            id: "slot-1",
            periodLabel: "1교시",
            subject: "과학",
            start: "09:10",
            end: "09:50"
          }
        ]
      },
      meals: [
        {
          id: "meal-1",
          date: "2026-03-08",
          items: ["카레"]
        }
      ],
      display: {
        monitorMode: "single",
        offsetXPercent: 12
      },
      autoApplyEveryMinute: false
    } as Partial<AppState> as AppState;

    const merged = mergeWithDefaults(incoming);

    expect(merged.schoolInfo.schoolName).toBe("테스트학교");
    expect(merged.schoolInfo.className).toBe(defaultState.schoolInfo.className);
    expect(merged.timetable.mon[0]?.subject).toBe("과학");
    expect(merged.timetable.tue).toHaveLength(defaultState.timetable.tue.length);
    expect(merged.meals[0]?.items).toEqual(["카레"]);
    expect(merged.display.monitorMode).toBe("single");
    expect(merged.display.offsetXPercent).toBe(12);
    expect(merged.display.offsetYPercent).toBe(defaultState.display.offsetYPercent);
    expect(merged.autoApplyEveryMinute).toBe(false);

    vi.useRealTimers();
  });
});
