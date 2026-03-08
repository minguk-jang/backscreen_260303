import dayjs from "dayjs";
import type { AppState, EventEntry } from "../../types";
import type { Rect } from "../layout";
import { limitItems } from "../sectionCapacity";
import { drawFittedText, roundRect } from "./canvas";
import { darkenHex, lightenHex } from "./color";
import { FONT_BODY, FONT_HEADING, WEEK_LABELS } from "./constants";

interface CalendarCell {
  isoDate: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  hasEvent: boolean;
}

function buildCalendarCells(now: dayjs.Dayjs, eventDates: Set<string>): CalendarCell[] {
  const monthStart = now.startOf("month");
  const gridStart = monthStart.startOf("week");

  return Array.from({ length: 42 }, (_, index) => {
    const date = gridStart.add(index, "day");
    const isoDate = date.format("YYYY-MM-DD");

    return {
      isoDate,
      dayNumber: date.date(),
      inMonth: date.month() === now.month(),
      isToday: date.isSame(now, "day"),
      hasEvent: eventDates.has(isoDate)
    };
  });
}

function drawMonthlyCalendar(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  state: AppState,
  now: dayjs.Dayjs,
  eventDates: Set<string>
): number {
  const titleColor = darkenHex(state.theme.primaryText, 0.1);

  drawFittedText(ctx, {
    text: `${now.format("YYYY년 M월")}`,
    x: rect.x,
    y: rect.y + 18,
    maxWidth: rect.w,
    maxFont: 22,
    minFont: 12,
    family: FONT_BODY,
    weight: 700,
    color: titleColor
  });

  const weekLabelY = rect.y + 42;
  const colGap = 4;
  const rowGap = 4;
  const cellW = (rect.w - colGap * 6) / 7;
  const calendarTop = weekLabelY + 10;
  const calendarHeight = Math.max(120, Math.min(rect.h * 0.58, 220));
  const cellH = (calendarHeight - rowGap * 5) / 6;

  WEEK_LABELS.forEach((label, index) => {
    drawFittedText(ctx, {
      text: label,
      x: rect.x + index * (cellW + colGap) + cellW / 2,
      y: weekLabelY,
      maxWidth: cellW,
      maxFont: 16,
      minFont: 10,
      family: FONT_BODY,
      weight: 700,
      color: titleColor,
      align: "center"
    });
  });

  buildCalendarCells(now, eventDates).forEach((cell, index) => {
    const row = Math.floor(index / 7);
    const col = index % 7;
    const x = rect.x + col * (cellW + colGap);
    const y = calendarTop + row * (cellH + rowGap);

    ctx.fillStyle = cell.inMonth ? `${state.theme.panelAlt}ef` : "rgba(255,255,255,0.58)";
    roundRect(ctx, x, y, cellW, cellH, 8, true, false);

    if (cell.isToday) {
      ctx.strokeStyle = state.theme.accent;
      ctx.lineWidth = 2;
      roundRect(ctx, x + 1, y + 1, cellW - 2, cellH - 2, 7, false, true);
    }

    drawFittedText(ctx, {
      text: String(cell.dayNumber),
      x: x + 6,
      y: y + 16,
      maxWidth: cellW - 14,
      maxFont: 16,
      minFont: 9,
      family: FONT_BODY,
      weight: cell.isToday ? 700 : 500,
      color: cell.inMonth ? state.theme.primaryText : lightenHex(state.theme.primaryText, 0.2)
    });

    if (cell.hasEvent && cell.inMonth) {
      ctx.fillStyle = state.theme.accent;
      roundRect(ctx, x + cellW - 11, y + cellH - 11, 6, 6, 3, true, false);
    }
  });

  return calendarTop + 6 * cellH + 5 * rowGap + 14;
}

function drawEventCards(
  ctx: CanvasRenderingContext2D,
  body: Rect,
  state: AppState,
  now: dayjs.Dayjs,
  monthlyEvents: EventEntry[],
  cardsTop: number
): void {
  const available = Math.max(0, body.y + body.h - cardsTop);
  const cardGap = 8;
  const cardH = 58;
  const maxCards = Math.max(0, Math.floor((available + cardGap) / (cardH + cardGap)));

  const source = monthlyEvents.length === 0
    ? [{
        id: "empty",
        date: now.format("YYYY-MM-DD"),
        title: "등록된 일정 없음",
        details: "",
        color: state.theme.accent
      }]
    : monthlyEvents;
  const limited = limitItems(source, maxCards);

  let y = cardsTop;
  for (const event of limited.visible) {
    ctx.fillStyle = `${event.color}24`;
    roundRect(ctx, body.x, y - 20, body.w, cardH, 10, true, false);

    drawFittedText(ctx, {
      text: `${dayjs(event.date).format("M/D")} ${event.title}`.trim(),
      x: body.x + 8,
      y,
      maxWidth: body.w - 16,
      maxFont: 18,
      minFont: 11,
      family: FONT_HEADING,
      weight: 700,
      color: darkenHex(event.color, 0.06)
    });

    drawFittedText(ctx, {
      text: event.details.trim().length > 0 ? event.details : "상세 없음",
      x: body.x + 8,
      y: y + 20,
      maxWidth: body.w - 16,
      maxFont: 14,
      minFont: 10,
      family: FONT_BODY,
      weight: 500,
      color: state.theme.primaryText
    });

    y += cardH + cardGap;
  }

  if (limited.hidden > 0) {
    drawFittedText(ctx, {
      text: `+${limited.hidden}개 더 있음`,
      x: body.x,
      y: Math.min(body.y + body.h - 4, y + 6),
      maxWidth: body.w,
      maxFont: 16,
      minFont: 11,
      family: FONT_BODY,
      weight: 500,
      color: darkenHex(state.theme.primaryText, 0.08)
    });
  }
}

export function drawEventsSection(
  ctx: CanvasRenderingContext2D,
  body: Rect,
  state: AppState,
  now: dayjs.Dayjs,
  monthlyEvents: EventEntry[]
): void {
  ctx.textAlign = "left";
  const cardsTop = drawMonthlyCalendar(ctx, body, state, now, new Set(monthlyEvents.map((event) => event.date)));
  drawEventCards(ctx, body, state, now, monthlyEvents, cardsTop);
}
