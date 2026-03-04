import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MealImportPanel } from "./MealImportPanel";

describe("MealImportPanel", () => {
  it("shows parse error message when extracted text has no meal data", async () => {
    render(<MealImportPanel monthKey="2026-03" onApplyMeals={vi.fn()} />);

    const input = screen.getByLabelText("파일 선택");
    const file = new File(["급식표\n기장밥\n콩나물국"], "sample.pdf", {
      type: "application/pdf"
    });

    fireEvent.change(input, { target: { files: [file] } });

    expect(
      await screen.findByText("문서 형식에서 급식 날짜/메뉴를 찾지 못했습니다.")
    ).toBeInTheDocument();
  });
});
