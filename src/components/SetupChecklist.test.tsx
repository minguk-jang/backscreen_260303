import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SetupChecklist } from "./SetupChecklist";

describe("SetupChecklist", () => {
  it("shows progress text", () => {
    render(
      <SetupChecklist
        completed={2}
        total={4}
        items={[
          { key: "school", label: "학교 정보 입력", done: true },
          { key: "meal", label: "이번 달 급식 등록", done: true },
          { key: "event", label: "이번 달 일정 등록", done: false },
          { key: "apply", label: "배경 적용 1회", done: false }
        ]}
      />
    );

    expect(screen.getByText("진행률 2/4")).toBeInTheDocument();
  });
});
