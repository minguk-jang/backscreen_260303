import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { defaultState } from "../defaults";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn()
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => undefined)
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockImplementation((command: string) => {
    if (command === "load_app_state") {
      return Promise.resolve(defaultState);
    }
    if (command === "get_primary_screen_size") {
      return Promise.resolve({ width: 1366, height: 768 });
    }
    return Promise.resolve(undefined);
  });
});

describe("App layout", () => {
  it("does not render quick monthly editor and shows todo panel", () => {
    render(<App />);
    expect(screen.queryByText("이번 달 빠른 수정")).toBeNull();
    expect(screen.getByRole("heading", { name: "Todo 관리" })).toBeInTheDocument();
    expect(screen.getByText("시간표는 학기 시작 시 1회 수정하면 됩니다.")).toBeInTheDocument();
  });

  it("calls uninstall_app when confirm text is exact", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("확인 입력"), { target: { value: "삭제" } });
    fireEvent.click(screen.getByRole("button", { name: "앱 제거 실행" }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("uninstall_app", { confirmText: "삭제" });
    });
  });

  it("passes display target payload when applying wallpaper", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "지금 배경 적용" }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        "apply_wallpaper_image",
        expect.objectContaining({
          pngBase64: expect.any(String),
          monitorMode: "primary",
          monitorId: null
        })
      );
    });
  });
});
