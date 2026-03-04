import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TodoWidget } from "./TodoWidget";

describe("TodoWidget", () => {
  it("strikes through checked todo and keeps delete hidden", () => {
    render(
      <TodoWidget
        todos={[
          {
            id: "1",
            text: "학습지 배부",
            done: true,
            order: 2,
            createdAt: "2026-03-04T00:00:00.000Z"
          }
        ]}
      />
    );

    expect(screen.getByText("학습지 배부")).toHaveClass("todo-done");
    expect(screen.queryByRole("button", { name: "삭제" })).toBeNull();
  });
});
