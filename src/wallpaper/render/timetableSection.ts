import dayjs from "dayjs";
import type { AppState } from "../../types";
import { weekdayOptions } from "../../defaults";
import { limitItems } from "../sectionCapacity";
import type { Rect } from "../layout";
import { drawFittedText, roundRect } from "./canvas";
import { darkenHex } from "./color";
import { FONT_BODY, FONT_HEADING } from "./constants";

export function drawTimetableSection(
  ctx: CanvasRenderingContext2D,
  body: Rect,
  state: AppState,
  now: dayjs.Dayjs
): void {
  const todayWeekday = weekdayOptions[(now.day() + 6) % 7];
  const dayKey = todayWeekday?.key;
  const todaySlots = dayKey ? state.timetable[dayKey] ?? [] : [];

  ctx.textAlign = "left";

  const rowGap = 8;
  const rowMinH = 58;
  const reserveBottom = 24;
  const maxRows = Math.max(0, Math.floor((body.h - reserveBottom + rowGap) / (rowMinH + rowGap)));
  const limited = limitItems(todaySlots, maxRows);

  if (limited.visible.length === 0) {
    drawFittedText(ctx, {
      text: "오늘 수업 정보 없음",
      x: body.x + 4,
      y: body.y + 32,
      maxWidth: body.w - 8,
      maxFont: 20,
      minFont: 13,
      family: FONT_BODY,
      weight: 500,
      color: state.theme.primaryText
    });
    return;
  }

  const rows = limited.visible.length;
  const dynamicH = (body.h - rowGap * (rows - 1) - (limited.hidden > 0 ? 22 : 0)) / rows;
  const rowH = Math.max(rowMinH, Math.min(84, dynamicH));

  let y = body.y;
  for (const slot of limited.visible) {
    ctx.fillStyle = state.theme.panelAlt;
    roundRect(ctx, body.x, y, body.w, rowH, 12, true, false);

    drawFittedText(ctx, {
      text: `${slot.periodLabel} ${slot.subject}`.trim(),
      x: body.x + 10,
      y: y + Math.max(30, rowH * 0.48),
      maxWidth: body.w - 20,
      maxFont: 24,
      minFont: 12,
      family: FONT_HEADING,
      weight: 700,
      color: state.theme.accent
    });

    drawFittedText(ctx, {
      text: `${slot.start} ~ ${slot.end}`,
      x: body.x + 10,
      y: y + Math.max(50, rowH * 0.8),
      maxWidth: body.w - 20,
      maxFont: 20,
      minFont: 11,
      family: FONT_BODY,
      weight: 500,
      color: state.theme.primaryText
    });

    y += rowH + rowGap;
  }

  if (limited.hidden > 0) {
    drawFittedText(ctx, {
      text: `+${limited.hidden}개 더 있음`,
      x: body.x + 4,
      y: Math.min(body.y + body.h - 4, y + 14),
      maxWidth: body.w - 8,
      maxFont: 16,
      minFont: 11,
      family: FONT_BODY,
      weight: 500,
      color: darkenHex(state.theme.primaryText, 0.08)
    });
  }
}
