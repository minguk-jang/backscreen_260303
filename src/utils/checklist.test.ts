import { describe, expect, it } from "vitest";
import { defaultState } from "../defaults";
import { buildSetupChecklist } from "./checklist";

describe("buildSetupChecklist", () => {
  it("marks monthly meal/event steps complete when current month has entries", () => {
    const now = "2026-03-03";
    const result = buildSetupChecklist(defaultState, now, true);
    expect(result.total).toBe(4);
    expect(result.completed).toBeGreaterThanOrEqual(2);
  });
});
