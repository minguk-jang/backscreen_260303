import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "../App";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue({})
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => undefined)
}));

describe("responsive layout classes", () => {
  it("applies dashboard root class", () => {
    const { container } = render(<App />);
    expect(container.querySelector(".dashboard-grid")).not.toBeNull();
  });
});
