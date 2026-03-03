import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { defaultState } from "./defaults";
import { getCurrentClass } from "./currentClass";

describe("getCurrentClass", () => {
  it("returns first slot during Monday first period", () => {
    const now = dayjs("2026-03-02T09:10:00");
    const current = getCurrentClass(defaultState, now);
    expect(current?.periodLabel).toBe("1교시");
  });
});
