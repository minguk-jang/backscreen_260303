import { describe, expect, it } from "vitest";
import { defaultState } from "../defaults";
import { validateState } from "./validation";

describe("validateState", () => {
  it("returns actionable message when event title is empty", () => {
    const state = {
      ...defaultState,
      events: [{ ...defaultState.events[0], title: "" }]
    };

    const issues = validateState(state);
    expect(issues[0].message).toContain("일정 제목");
    expect(issues[0].fix).toContain("제목을 입력");
  });

  it("validates content scale and todo text", () => {
    const state = {
      ...defaultState,
      // TODO/display fields are added incrementally; test should fail before implementation.
      display: {
        monitorMode: "primary",
        contentScalePercent: 150
      },
      todos: [
        {
          id: "t1",
          text: "   ",
          done: false,
          order: 1,
          createdAt: "2026-03-04T09:00:00.000Z"
        }
      ]
    } as typeof defaultState & {
      display: { monitorMode: string; contentScalePercent: number };
      todos: Array<{
        id: string;
        text: string;
        done: boolean;
        order: number;
        createdAt: string;
      }>;
    };

    const issues = validateState(state);
    expect(issues.some((issue) => issue.path.includes("display.contentScalePercent"))).toBe(true);
    expect(issues.some((issue) => issue.path.includes("todos"))).toBe(true);
  });
});
