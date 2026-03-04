import dayjs from "dayjs";
import type { AppState, EventEntry } from "./types";
import { getCurrentClass } from "./currentClass";
import { weekdayOptions } from "./defaults";
import { limitItems } from "./wallpaper/sectionCapacity";
import { computeLayout, type Rect, type WallpaperLayout } from "./wallpaper/layout";
import { fitText } from "./wallpaper/textFit";

const FONT_HEADING = '"Jua", "Gowun Dodum", "Segoe UI", sans-serif';
const FONT_BODY = '"Gowun Dodum", "Pretendard", "Segoe UI", sans-serif';
const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

interface CalendarCell {
  isoDate: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  hasEvent: boolean;
}

export function getWallpaperLayout(width: number, height: number): WallpaperLayout {
  return computeLayout(width, height);
}

function safeList(items: string[]): string[] {
  return items.filter((item) => item.trim().length > 0).slice(0, 50);
}

function fillBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number, background: string): void {
  const topGradient = ctx.createLinearGradient(0, 0, 0, height);
  topGradient.addColorStop(0, background);
  topGradient.addColorStop(1, lightenHex(background, 0.07));
  ctx.fillStyle = topGradient;
  ctx.fillRect(0, 0, width, height);

  const bubbleA = ctx.createRadialGradient(width * 0.08, height * 0.12, 0, width * 0.08, height * 0.12, width * 0.24);
  bubbleA.addColorStop(0, "rgba(255, 234, 202, 0.72)");
  bubbleA.addColorStop(1, "rgba(255, 234, 202, 0)");
  ctx.fillStyle = bubbleA;
  ctx.fillRect(0, 0, width, height);

  const bubbleB = ctx.createRadialGradient(width * 0.88, height * 0.09, 0, width * 0.88, height * 0.09, width * 0.26);
  bubbleB.addColorStop(0, "rgba(255, 214, 228, 0.66)");
  bubbleB.addColorStop(1, "rgba(255, 214, 228, 0)");
  ctx.fillStyle = bubbleB;
  ctx.fillRect(0, 0, width, height);

  const bubbleC = ctx.createRadialGradient(width * 0.5, height * 0.95, 0, width * 0.5, height * 0.95, width * 0.35);
  bubbleC.addColorStop(0, "rgba(226, 242, 234, 0.42)");
  bubbleC.addColorStop(1, "rgba(226, 242, 234, 0)");
  ctx.fillStyle = bubbleC;
  ctx.fillRect(0, 0, width, height);
}

interface DrawFitOptions {
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  maxFont: number;
  minFont: number;
  family: string;
  weight?: number;
  color: string;
  align?: CanvasTextAlign;
}

function setCanvasFont(
  ctx: CanvasRenderingContext2D,
  fontSize: number,
  family: string,
  fontWeight: number
): void {
  ctx.font = `${fontWeight} ${Math.max(1, Math.round(fontSize))}px ${family}`;
}

function drawFittedText(ctx: CanvasRenderingContext2D, opts: DrawFitOptions): { text: string; fontSize: number } {
  if (opts.maxWidth <= 0) {
    return { text: "", fontSize: opts.minFont };
  }

  const measure = (value: string, size: number): number => {
    setCanvasFont(ctx, size, opts.family, opts.weight ?? 400);
    return ctx.measureText(value).width;
  };

  const fitted = fitText(opts.text, {
    maxWidth: opts.maxWidth,
    maxFont: opts.maxFont,
    minFont: opts.minFont,
    measure
  });

  setCanvasFont(ctx, fitted.fontSize, opts.family, opts.weight ?? 400);
  ctx.fillStyle = opts.color;
  ctx.textAlign = opts.align ?? "left";
  ctx.fillText(fitted.text, opts.x, opts.y);

  return fitted;
}

function drawPanelShell(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  title: string,
  theme: AppState["theme"]
): Rect {
  ctx.fillStyle = `${theme.panel}f3`;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 18, true, false);

  drawFittedText(ctx, {
    text: title,
    x: rect.x + rect.w / 2,
    y: rect.y + 44,
    maxWidth: rect.w - 30,
    maxFont: Math.min(38, Math.max(22, rect.w * 0.08)),
    minFont: 16,
    family: FONT_HEADING,
    weight: 700,
    color: theme.accent,
    align: "center"
  });

  ctx.strokeStyle = `${theme.accent}52`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rect.x + 16, rect.y + 62);
  ctx.lineTo(rect.x + rect.w - 16, rect.y + 62);
  ctx.stroke();

  return {
    x: rect.x + 14,
    y: rect.y + 70,
    w: rect.w - 28,
    h: rect.h - 82
  };
}

function drawHeaderSection(
  ctx: CanvasRenderingContext2D,
  header: Rect,
  state: AppState,
  now: dayjs.Dayjs,
  currentLabel: string
): void {
  ctx.fillStyle = `${state.theme.panel}ec`;
  roundRect(ctx, header.x, header.y, header.w, header.h, 24, true, false);

  const paddedX = header.x + 22;
  const paddedW = header.w - 44;

  drawFittedText(ctx, {
    text: now.format("M월 D일 (ddd) HH:mm"),
    x: header.x + header.w / 2,
    y: header.y + Math.max(62, header.h * 0.28),
    maxWidth: paddedW,
    maxFont: Math.min(78, Math.max(34, header.w * 0.043)),
    minFont: 22,
    family: FONT_HEADING,
    weight: 700,
    color: state.theme.accent,
    align: "center"
  });

  const schoolLine = `${state.schoolInfo.schoolName} ${state.schoolInfo.className}`.trim() || "학교/학급 정보 미입력";

  drawFittedText(ctx, {
    text: schoolLine,
    x: header.x + header.w / 2,
    y: header.y + Math.max(106, header.h * 0.47),
    maxWidth: paddedW,
    maxFont: Math.min(30, Math.max(18, header.w * 0.02)),
    minFont: 14,
    family: FONT_BODY,
    weight: 500,
    color: darkenHex(state.theme.primaryText, 0.18),
    align: "center"
  });

  const currentCardH = Math.max(52, Math.min(110, header.h * 0.34));
  const currentCardY = header.y + header.h - currentCardH - 16;

  ctx.fillStyle = state.theme.panelAlt;
  roundRect(ctx, paddedX, currentCardY, paddedW, currentCardH, 18, true, false);

  drawFittedText(ctx, {
    text: currentLabel,
    x: header.x + header.w / 2,
    y: currentCardY + currentCardH / 2 + Math.max(7, currentCardH * 0.08),
    maxWidth: paddedW - 24,
    maxFont: Math.min(36, Math.max(18, header.w * 0.023)),
    minFont: 13,
    family: FONT_HEADING,
    weight: 700,
    color: state.theme.accent,
    align: "center"
  });
}

function drawTimetableSection(
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

function drawMealsSection(
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
    const x = rect.x + index * (cellW + colGap) + cellW / 2;
    drawFittedText(ctx, {
      text: label,
      x,
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

  const cells = buildCalendarCells(now, eventDates);

  cells.forEach((cell, index) => {
    const row = Math.floor(index / 7);
    const col = index % 7;

    const x = rect.x + col * (cellW + colGap);
    const y = calendarTop + row * (cellH + rowGap);

    const bg = cell.inMonth ? `${state.theme.panelAlt}ef` : "rgba(255,255,255,0.58)";
    ctx.fillStyle = bg;
    roundRect(ctx, x, y, cellW, cellH, 8, true, false);

    if (cell.isToday) {
      ctx.strokeStyle = state.theme.accent;
      ctx.lineWidth = 2;
      roundRect(ctx, x + 1, y + 1, cellW - 2, cellH - 2, 7, false, true);
    }

    const textColor = cell.inMonth ? state.theme.primaryText : lightenHex(state.theme.primaryText, 0.2);

    drawFittedText(ctx, {
      text: String(cell.dayNumber),
      x: x + 6,
      y: y + 16,
      maxWidth: cellW - 14,
      maxFont: 16,
      minFont: 9,
      family: FONT_BODY,
      weight: cell.isToday ? 700 : 500,
      color: textColor
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

function drawEventsSection(
  ctx: CanvasRenderingContext2D,
  body: Rect,
  state: AppState,
  now: dayjs.Dayjs,
  monthlyEvents: EventEntry[]
): void {
  ctx.textAlign = "left";

  const eventDates = new Set(monthlyEvents.map((event) => event.date));
  const cardsTop = drawMonthlyCalendar(ctx, body, state, now, eventDates);
  drawEventCards(ctx, body, state, now, monthlyEvents, cardsTop);
}

export function renderWallpaperImage(state: AppState, width: number, height: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  const now = dayjs();
  const today = now.format("YYYY-MM-DD");
  const monthKey = now.format("YYYY-MM");

  const mealsToday = state.meals.find((entry) => entry.date === today);
  const mealsTodayItems = mealsToday ? safeList(mealsToday.items) : [];
  const monthlyEvents = state.events
    .filter((entry) => entry.date.startsWith(monthKey))
    .sort((a, b) => a.date.localeCompare(b.date));
  const current = getCurrentClass(state, now);

  fillBackdrop(ctx, width, height, state.theme.background);

  const contentScale = Math.max(0.8, Math.min(1.3, state.display.contentScalePercent / 100));
  const layout = computeLayout(width, height, contentScale);
  const currentLabel = current ? `${current.subject} 수업 중입니다.` : "현재 수업 시간이 아닙니다.";

  drawHeaderSection(ctx, layout.header, state, now, currentLabel);

  const timetableBody = drawPanelShell(ctx, layout.columns[0], "요일별 시간표", state.theme);
  const mealsBody = drawPanelShell(ctx, layout.columns[1], "급식 메뉴", state.theme);
  const eventsBody = drawPanelShell(ctx, layout.columns[2], "학교 교육 활동", state.theme);

  drawTimetableSection(ctx, timetableBody, state, now);
  drawMealsSection(ctx, mealsBody, state, now, mealsTodayItems);
  drawEventsSection(ctx, eventsBody, state, now, monthlyEvents);

  return canvas.toDataURL("image/png");
}

function lightenHex(hex: string, amount: number): string {
  return adjustHex(hex, Math.abs(amount));
}

function darkenHex(hex: string, amount: number): string {
  return adjustHex(hex, -Math.abs(amount));
}

function adjustHex(hex: string, delta: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return hex;
  }

  const channels = [0, 2, 4].map((idx) => {
    const base = Number.parseInt(normalized.slice(idx, idx + 2), 16);
    const next = Math.max(0, Math.min(255, Math.round(base + 255 * delta)));
    return next.toString(16).padStart(2, "0");
  });

  return `#${channels.join("")}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: boolean,
  stroke: boolean
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();

  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}
