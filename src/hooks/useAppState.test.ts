import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

import { useAppState } from "./useAppState";

describe("useAppState", () => {
  it("exposes saveAndApply action", () => {
    const { result } = renderHook(() => useAppState());
    expect(typeof result.current.saveAndApply).toBe("function");
  });
});
