import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UninstallPanel } from "./UninstallPanel";

afterEach(() => {
  cleanup();
});

describe("UninstallPanel", () => {
  it("keeps uninstall button disabled until exact confirm text is entered", () => {
    const onUninstall = vi.fn().mockResolvedValue(undefined);
    render(<UninstallPanel onUninstall={onUninstall} />);

    const button = screen.getByRole("button", { name: "앱 제거 실행" });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText("확인 입력"), { target: { value: "삭제 " } });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText("확인 입력"), { target: { value: "삭제" } });
    expect(button).toBeEnabled();
  });

  it("calls onUninstall when confirm text matches exactly", async () => {
    const onUninstall = vi.fn().mockResolvedValue(undefined);
    render(<UninstallPanel onUninstall={onUninstall} />);

    fireEvent.change(screen.getByLabelText("확인 입력"), { target: { value: "삭제" } });
    fireEvent.click(screen.getByRole("button", { name: "앱 제거 실행" }));

    await waitFor(() => {
      expect(onUninstall).toHaveBeenCalledWith("삭제");
    });
  });
});
