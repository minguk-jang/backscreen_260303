import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuickMonthlyEditor } from "./QuickMonthlyEditor";

describe("QuickMonthlyEditor", () => {
  it("calls onQuickAddEvent with date and title", () => {
    const onQuickAddEvent = vi.fn();

    render(
      <QuickMonthlyEditor
        monthKey="2026-03"
        meals={[]}
        events={[]}
        onQuickAddEvent={onQuickAddEvent}
        onQuickAddMeal={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("일정 날짜"), { target: { value: "2026-03-10" } });
    fireEvent.change(screen.getByLabelText("일정 제목"), { target: { value: "학부모 상담" } });
    fireEvent.click(screen.getByRole("button", { name: "일정 빠른 추가" }));

    expect(onQuickAddEvent).toHaveBeenCalledWith("2026-03-10", "학부모 상담");
  });
});
