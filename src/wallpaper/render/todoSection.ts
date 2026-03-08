import type { AppState, TodoEntry } from "../../types";
import type { Rect } from "../layout";
import { limitItems } from "../sectionCapacity";
import { drawFittedText, roundRect } from "./canvas";
import { darkenHex } from "./color";
import { FONT_BODY, FONT_HEADING } from "./constants";

export function sortTodosForWallpaper(todos: TodoEntry[]): TodoEntry[] {
  return [...todos].sort((a, b) => {
    const doneDelta = Number(a.done) - Number(b.done);
    if (doneDelta !== 0) {
      return doneDelta;
    }

    const orderDelta = a.order - b.order;
    if (orderDelta !== 0) {
      return orderDelta;
    }

    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function drawTodoSection(
  ctx: CanvasRenderingContext2D,
  body: Rect,
  state: AppState,
  todos: TodoEntry[]
): void {
  ctx.fillStyle = `${state.theme.panelAlt}f1`;
  roundRect(ctx, body.x, body.y, body.w, body.h, 10, true, false);

  drawFittedText(ctx, {
    text: "Todo",
    x: body.x + 8,
    y: body.y + 20,
    maxWidth: body.w - 16,
    maxFont: 18,
    minFont: 12,
    family: FONT_HEADING,
    weight: 700,
    color: state.theme.accent
  });

  const rowStartY = body.y + 38;
  const rowGap = 5;
  const rowH = 18;
  const available = Math.max(0, body.h - (rowStartY - body.y) - 4);
  const maxRows = Math.max(0, Math.floor((available + rowGap) / (rowH + rowGap)));
  const source = todos.length > 0
    ? todos
    : [{
        id: "todo-empty",
        text: "할 일 없음",
        done: false,
        order: 0,
        createdAt: ""
      }];
  const limited = limitItems(source, maxRows);

  let y = rowStartY;
  for (const todo of limited.visible) {
    const label = todo.done ? `완료 ${todo.text}` : todo.text;
    drawFittedText(ctx, {
      text: `• ${label}`,
      x: body.x + 8,
      y,
      maxWidth: body.w - 16,
      maxFont: 14,
      minFont: 10,
      family: FONT_BODY,
      weight: 500,
      color: todo.done ? darkenHex(state.theme.primaryText, -0.12) : state.theme.primaryText
    });
    y += rowH + rowGap;
  }

  if (limited.hidden > 0) {
    drawFittedText(ctx, {
      text: `+${limited.hidden}개 더 있음`,
      x: body.x + 8,
      y: Math.min(body.y + body.h - 4, y + 6),
      maxWidth: body.w - 16,
      maxFont: 13,
      minFont: 10,
      family: FONT_BODY,
      weight: 500,
      color: darkenHex(state.theme.primaryText, 0.08)
    });
  }
}
