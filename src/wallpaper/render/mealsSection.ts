import dayjs from "dayjs";
import type { AppState, TodoEntry } from "../../types";
import type { Rect } from "../layout";
import { limitItems } from "../sectionCapacity";
import { drawFittedText, roundRect } from "./canvas";
import { darkenHex } from "./color";
import { FONT_BODY } from "./constants";
import { drawTodoSection } from "./todoSection";

export function safeList(items: string[]): string[] {
  return items.filter((item) => item.trim().length > 0).slice(0, 50);
}

export function drawMealsSection(
  ctx: CanvasRenderingContext2D,
  body: Rect,
  state: AppState,
  now: dayjs.Dayjs,
  mealsTodayItems: string[]
): void {
  ctx.textAlign = "left";

  drawFittedText(ctx, {
    text: now.format("M/D(ddd)"),
    x: body.x + body.w / 2,
    y: body.y + 18,
    maxWidth: body.w,
    maxFont: 22,
    minFont: 12,
    family: FONT_BODY,
    weight: 700,
    color: state.theme.primaryText,
    align: "center"
  });

  const chipYStart = body.y + 36;
  const chipH = 30;
  const chipGap = 7;
  const available = Math.max(0, body.h - (chipYStart - body.y));
  const maxCount = Math.max(0, Math.floor((available + chipGap) / (chipH + chipGap)));
  const source = mealsTodayItems.length > 0 ? mealsTodayItems : ["등록된 급식 정보 없음"];
  const limited = limitItems(source, maxCount);

  let y = chipYStart;
  for (const item of limited.visible) {
    const chipTop = y - 18;
    const chipTextY = chipTop + chipH * 0.68;

    ctx.fillStyle = `${state.theme.accent}4f`;
    roundRect(ctx, body.x, chipTop, body.w, chipH, 8, true, false);

    drawFittedText(ctx, {
      text: item,
      x: body.x + body.w / 2,
      y: chipTextY,
      maxWidth: body.w - 16,
      maxFont: 20,
      minFont: 11,
      family: FONT_BODY,
      weight: 500,
      color: state.theme.primaryText,
      align: "center"
    });

    y += chipH + chipGap;
  }

  if (limited.hidden > 0) {
    drawFittedText(ctx, {
      text: `+${limited.hidden}개 더 있음`,
      x: body.x + body.w / 2,
      y: Math.min(body.y + body.h - 4, y + 8),
      maxWidth: body.w,
      maxFont: 16,
      minFont: 11,
      family: FONT_BODY,
      weight: 500,
      color: darkenHex(state.theme.primaryText, 0.08),
      align: "center"
    });
  }
}

export function drawMealsAndTodoSection(
  ctx: CanvasRenderingContext2D,
  body: Rect,
  state: AppState,
  now: dayjs.Dayjs,
  mealsTodayItems: string[],
  todos: TodoEntry[]
): void {
  if (body.h < 150) {
    drawMealsSection(ctx, body, state, now, mealsTodayItems);
    return;
  }

  const gap = Math.max(8, Math.min(14, body.h * 0.03));
  const minTodoH = 74;
  const maxTodoH = 120;
  const desiredTodoH = body.h * 0.33;
  const todoH = Math.max(minTodoH, Math.min(maxTodoH, desiredTodoH));
  const mealsH = Math.max(80, body.h - todoH - gap);

  drawMealsSection(ctx, { x: body.x, y: body.y, w: body.w, h: mealsH }, state, now, mealsTodayItems);
  drawTodoSection(
    ctx,
    {
      x: body.x,
      y: body.y + mealsH + gap,
      w: body.w,
      h: body.h - mealsH - gap
    },
    state,
    todos
  );
}
