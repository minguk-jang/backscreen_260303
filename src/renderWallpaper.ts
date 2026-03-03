import dayjs from "dayjs";
import type { AppState } from "./types";
import { getCurrentClass } from "./currentClass";
import { weekdayOptions } from "./defaults";

const FONT_HEADING = '"Jua", "Gowun Dodum", "Segoe UI", sans-serif';
const FONT_BODY = '"Gowun Dodum", "Pretendard", "Segoe UI", sans-serif';

function safeList(items: string[]): string[] {
  return items.filter((item) => item.trim().length > 0).slice(0, 7);
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
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
  const monthlyEvents = state.events
    .filter((entry) => entry.date.startsWith(monthKey))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const current = getCurrentClass(state, now);

  fillBackdrop(ctx, width, height, state.theme.background);

  const margin = Math.max(28, width * 0.022);
  const panelGap = Math.max(14, width * 0.013);
  const topHeight = Math.max(220, height * 0.27);

  ctx.fillStyle = `${state.theme.panel}ec`;
  roundRect(ctx, margin, margin, width - margin * 2, topHeight - 22, 24, true, false);

  ctx.fillStyle = state.theme.accent;
  ctx.font = `700 ${Math.round(width * 0.042)}px ${FONT_HEADING}`;
  ctx.textAlign = "center";
  ctx.fillText(now.format("M월 D일 (ddd) HH:mm"), width / 2, margin + 64);

  ctx.fillStyle = darkenHex(state.theme.primaryText, 0.18);
  ctx.font = `${Math.round(width * 0.016)}px ${FONT_BODY}`;
  ctx.fillText(`${state.schoolInfo.schoolName} ${state.schoolInfo.className}`.trim(), width / 2, margin + 106);

  ctx.fillStyle = state.theme.panelAlt;
  roundRect(ctx, margin + 20, margin + 126, width - margin * 2 - 40, topHeight - 168, 20, true, false);

  ctx.fillStyle = state.theme.accent;
  ctx.font = `700 ${Math.round(width * 0.024)}px ${FONT_HEADING}`;
  const currentLabel = current ? `${current.subject} 수업 중입니다.` : "현재 수업 시간이 아닙니다.";
  ctx.fillText(currentLabel, width / 2, margin + 184);

  const bodyY = margin + topHeight;
  const bodyHeight = height - bodyY - margin;
  const colWidth = (width - margin * 2 - panelGap * 2) / 3;

  drawPanel(ctx, margin, bodyY, colWidth, bodyHeight, "요일별 시간표", state.theme);
  drawPanel(ctx, margin + colWidth + panelGap, bodyY, colWidth, bodyHeight, "급식 메뉴", state.theme);
  drawPanel(ctx, margin + (colWidth + panelGap) * 2, bodyY, colWidth, bodyHeight, "학교 교육 활동", state.theme);

  let scheduleY = bodyY + 88;
  const todayWeekday = weekdayOptions[(now.day() + 6) % 7];
  const dayKey = todayWeekday?.key;
  const todaySlots = dayKey ? state.timetable[dayKey] ?? [] : [];

  ctx.textAlign = "left";
  for (const slot of todaySlots.slice(0, 7)) {
    ctx.fillStyle = state.theme.panelAlt;
    roundRect(ctx, margin + 18, scheduleY, colWidth - 36, 82, 12, true, false);

    ctx.fillStyle = state.theme.accent;
    ctx.font = `700 ${Math.round(width * 0.016)}px ${FONT_HEADING}`;
    ctx.fillText(truncateText(ctx, `${slot.periodLabel} ${slot.subject}`.trim(), colWidth - 72), margin + 34, scheduleY + 34);

    ctx.fillStyle = state.theme.primaryText;
    ctx.font = `${Math.round(width * 0.013)}px ${FONT_BODY}`;
    ctx.fillText(`${slot.start} ~ ${slot.end}`, margin + 34, scheduleY + 61);
    scheduleY += 92;
  }

  const mealX = margin + colWidth + panelGap + 18;
  let mealY = bodyY + 95;

  ctx.fillStyle = state.theme.primaryText;
  ctx.font = `${Math.round(width * 0.014)}px ${FONT_BODY}`;
  ctx.fillText(now.format("M/D(ddd)"), mealX, bodyY + 66);

  ctx.font = `${Math.round(width * 0.014)}px ${FONT_BODY}`;
  const mealItems = mealsToday ? safeList(mealsToday.items) : ["등록된 급식 정보 없음"];
  mealItems.forEach((item) => {
    const markerY = mealY - 8;
    ctx.fillStyle = `${state.theme.accent}55`;
    roundRect(ctx, mealX, markerY - 14, colWidth - 42, 32, 8, true, false);
    ctx.fillStyle = state.theme.primaryText;
    ctx.fillText(truncateText(ctx, item, colWidth - 58), mealX + 10, markerY + 7);
    mealY += 39;
  });

  const eventX = margin + (colWidth + panelGap) * 2 + 18;
  let eventY = bodyY + 90;

  ctx.fillStyle = state.theme.primaryText;
  ctx.font = `${Math.round(width * 0.014)}px ${FONT_BODY}`;
  ctx.fillText(now.format("M월 일정"), eventX, bodyY + 66);

  if (monthlyEvents.length === 0) {
    ctx.fillText("등록된 일정 없음", eventX, eventY);
  } else {
    monthlyEvents.forEach((event) => {
      ctx.fillStyle = `${event.color}24`;
      roundRect(ctx, eventX, eventY - 22, colWidth - 36, 70, 10, true, false);

      ctx.fillStyle = darkenHex(event.color, 0.06);
      ctx.font = `700 ${Math.round(width * 0.013)}px ${FONT_HEADING}`;
      ctx.fillText(
        truncateText(ctx, `${dayjs(event.date).format("M/D")} ${event.title}`, colWidth - 62),
        eventX + 10,
        eventY
      );

      ctx.fillStyle = state.theme.primaryText;
      ctx.font = `${Math.round(width * 0.011)}px ${FONT_BODY}`;
      ctx.fillText(truncateText(ctx, event.details || "상세 내용 없음", colWidth - 62), eventX + 10, eventY + 22);
      eventY += 80;
    });
  }

  return canvas.toDataURL("image/png");
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  theme: AppState["theme"]
): void {
  const titleSize = Math.max(21, Math.min(38, Math.round(w * 0.085)));

  ctx.fillStyle = `${theme.panel}f3`;
  roundRect(ctx, x, y, w, h, 18, true, false);

  ctx.fillStyle = theme.accent;
  ctx.font = `700 ${titleSize}px ${FONT_HEADING}`;
  ctx.textAlign = "center";
  ctx.fillText(title, x + w / 2, y + 46);

  ctx.strokeStyle = `${theme.accent}52`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 16, y + 62);
  ctx.lineTo(x + w - 16, y + 62);
  ctx.stroke();
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
    const base = parseInt(normalized.slice(idx, idx + 2), 16);
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
