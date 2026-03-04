import type { TodoEntry } from "../types";

function byOrder(a: TodoEntry, b: TodoEntry): number {
  if (a.order !== b.order) {
    return a.order - b.order;
  }
  if (a.createdAt !== b.createdAt) {
    return a.createdAt.localeCompare(b.createdAt);
  }
  return a.id.localeCompare(b.id);
}

function normalizeOrder(items: TodoEntry[]): TodoEntry[] {
  return items.map((item, index) => ({
    ...item,
    order: index + 1
  }));
}

export function sortTodos(items: TodoEntry[]): TodoEntry[] {
  const pending = items.filter((item) => !item.done).sort(byOrder);
  const completed = items.filter((item) => item.done).sort(byOrder);
  return normalizeOrder([...pending, ...completed]);
}

export function toggleTodo(items: TodoEntry[], todoId: string, done: boolean): TodoEntry[] {
  let found = false;
  const next = items.map((item) => {
    if (item.id !== todoId) {
      return item;
    }
    found = true;
    return {
      ...item,
      done,
      doneAt: done ? new Date().toISOString() : undefined
    };
  });

  if (!found) {
    return sortTodos(next);
  }

  const pending = next.filter((item) => !item.done).sort(byOrder);
  const completed = next.filter((item) => item.done).sort(byOrder);

  if (done) {
    const idx = completed.findIndex((item) => item.id === todoId);
    if (idx >= 0) {
      const [moved] = completed.splice(idx, 1);
      completed.push(moved);
    }
  } else {
    const idx = pending.findIndex((item) => item.id === todoId);
    if (idx >= 0) {
      const [moved] = pending.splice(idx, 1);
      pending.push(moved);
    }
  }

  return normalizeOrder([...pending, ...completed]);
}
