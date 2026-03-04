import { describe, expect, it } from "vitest";
import type { TodoEntry } from "../types";
import { sortTodos, toggleTodo } from "./todos";

function makeTodo(id: string, text: string, done: boolean, order: number): TodoEntry {
  return {
    id,
    text,
    done,
    order,
    createdAt: "2026-03-04T00:00:00.000Z"
  };
}

describe("todos util", () => {
  it("moves checked todo to bottom", () => {
    const items = [makeTodo("a", "A", false, 1), makeTodo("b", "B", false, 2)];
    const next = toggleTodo(items, "a", true);

    expect(next[0].id).toBe("b");
    expect(next[1].id).toBe("a");
    expect(next[1].done).toBe(true);
    expect(next[1].doneAt).toBeDefined();
  });

  it("sorts unfinished before completed", () => {
    const items = [makeTodo("a", "A", true, 1), makeTodo("b", "B", false, 2), makeTodo("c", "C", true, 3)];
    const sorted = sortTodos(items);

    expect(sorted.map((item) => item.id)).toEqual(["b", "a", "c"]);
  });
});
