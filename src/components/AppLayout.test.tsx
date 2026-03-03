import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "../App";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue({})
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => undefined)
}));

describe("App layout", () => {
  it("renders timetable collapsed helper text", () => {
    render(<App />);
    expect(screen.getByText("시간표는 학기 시작 시 1회 수정하면 됩니다.")).toBeInTheDocument();
  });
});
