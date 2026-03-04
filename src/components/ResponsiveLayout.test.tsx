import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "../App";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue({})
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => undefined),
  emit: vi.fn().mockResolvedValue(undefined)
}));

describe("responsive layout classes", () => {
  it("applies dashboard root class", () => {
    const { container } = render(<App />);
    expect(container.querySelector(".dashboard-grid")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "디스플레이 설정" })).toBeInTheDocument();
    const slider = screen.getByLabelText("콘텐츠 크기");
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute("min", "50");
    expect(screen.getByRole("button", { name: "위치 초기화" })).toBeInTheDocument();
  });
});
