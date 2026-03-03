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
});
