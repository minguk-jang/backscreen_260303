import dayjs from "dayjs";
import type { AppState } from "./types";
import { getCurrentClass } from "./currentClass";
import { weekdayOptions } from "./defaults";

function safeList(items: string[]): string[] {
  return items.filter((item) => item.trim().length > 0).slice(0, 8);
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
  const mealsToday = state.meals.find((entry) => entry.date === today);
  const eventsToday = state.events.filter((entry) => entry.date === today);
  const current = getCurrentClass(state, now);

  ctx.fillStyle = state.theme.background;
  ctx.fillRect(0, 0, width, height);

  const margin = Math.max(28, width * 0.022);
  const panelGap = Math.max(14, width * 0.013);
  const topHeight = Math.max(220, height * 0.27);

  ctx.fillStyle = `${state.theme.panel}dd`;
  roundRect(ctx, margin, margin, width - margin * 2, topHeight - 20, 22, true, false);

  ctx.fillStyle = state.theme.accent;
  ctx.font = `bold ${Math.round(width * 0.042)}px "Segoe UI"`;
  ctx.textAlign = "center";
  ctx.fillText(now.format("M월 D일 (ddd) HH:mm"), width / 2, margin + 62);

  ctx.fillStyle = state.theme.primaryText;
  ctx.font = `${Math.round(width * 0.016)}px "Segoe UI"`;
  ctx.fillText(`${state.schoolInfo.schoolName} ${state.schoolInfo.className}`.trim(), width / 2, margin + 104);

  ctx.fillStyle = state.theme.panel;
  roundRect(ctx, margin + 18, margin + 124, width - margin * 2 - 36, topHeight - 162, 18, true, false);

  ctx.fillStyle = state.theme.accent;
  ctx.font = `bold ${Math.round(width * 0.024)}px "Segoe UI"`;
  const currentLabel = current
    ? `${current.subject} 수업 중입니다.`
    : "현재 수업 시간이 아닙니다.";
  ctx.fillText(currentLabel, width / 2, margin + 184);

  const bodyY = margin + topHeight;
  const bodyHeight = height - bodyY - margin;
  const colWidth = (width - margin * 2 - panelGap * 2) / 3;

  drawPanel(ctx, margin, bodyY, colWidth, bodyHeight, "요일별 시간표", state.theme);
  drawPanel(ctx, margin + colWidth + panelGap, bodyY, colWidth, bodyHeight, "급식 메뉴", state.theme);
  drawPanel(ctx, margin + (colWidth + panelGap) * 2, bodyY, colWidth, bodyHeight, "학교 교육 활동", state.theme);

  let scheduleY = bodyY + 86;
  const todayWeekday = weekdayOptions[(now.day() + 6) % 7];
  const dayKey = todayWeekday?.key;
  const todaySlots = dayKey ? state.timetable[dayKey] ?? [] : [];

  ctx.textAlign = "left";
  for (const slot of todaySlots.slice(0, 8)) {
    ctx.fillStyle = state.theme.panelAlt;
    roundRect(ctx, margin + 18, scheduleY, colWidth - 36, 84, 12, true, false);
    ctx.fillStyle = state.theme.accent;
    ctx.font = `bold ${Math.round(width * 0.017)}px "Segoe UI"`;
    ctx.fillText(`${slot.periodLabel} ${slot.subject}`.trim(), margin + 34, scheduleY + 36);
    ctx.fillStyle = state.theme.primaryText;
    ctx.font = `${Math.round(width * 0.014)}px "Segoe UI"`;
    ctx.fillText(`${slot.start}~${slot.end}`, margin + 34, scheduleY + 64);
    scheduleY += 94;
  }

  const mealX = margin + colWidth + panelGap + 18;
  let mealY = bodyY + 92;
  ctx.fillStyle = state.theme.primaryText;
  ctx.font = `${Math.round(width * 0.013)}px "Segoe UI"`;
  ctx.fillText(now.format("M/D(ddd)"), mealX, bodyY + 64);
  ctx.font = `${Math.round(width * 0.015)}px "Segoe UI"`;
  const mealItems = mealsToday ? safeList(mealsToday.items) : ["등록된 급식 정보 없음"];
  mealItems.forEach((item) => {
    ctx.fillText(item, mealX, mealY);
    mealY += 34;
  });

  const eventX = margin + (colWidth + panelGap) * 2 + 18;
  let eventY = bodyY + 90;
  const monthLabel = now.format("M월 일정");
  ctx.fillStyle = state.theme.primaryText;
  ctx.font = `${Math.round(width * 0.015)}px "Segoe UI"`;
  ctx.fillText(monthLabel, eventX, bodyY + 64);

  const shownEvents = eventsToday.length > 0 ? eventsToday.slice(0, 5) : [];
  if (shownEvents.length === 0) {
    ctx.fillText("등록된 일정 없음", eventX, eventY);
  } else {
    shownEvents.forEach((event) => {
      ctx.fillStyle = `${event.color}22`;
      roundRect(ctx, eventX, eventY - 24, colWidth - 36, 64, 10, true, false);
      ctx.fillStyle = event.color;
      ctx.font = `bold ${Math.round(width * 0.014)}px "Segoe UI"`;
      ctx.fillText(now.format("M/D") + " " + event.title, eventX + 12, eventY);
      ctx.fillStyle = state.theme.primaryText;
      ctx.font = `${Math.round(width * 0.012)}px "Segoe UI"`;
      ctx.fillText(event.details, eventX + 12, eventY + 20);
      eventY += 78;
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
  const titleSize = Math.max(22, Math.min(42, Math.round(w * 0.09)));

  ctx.fillStyle = theme.panel;
  roundRect(ctx, x, y, w, h, 16, true, false);
  ctx.fillStyle = theme.accent;
  ctx.font = `bold ${titleSize}px "Segoe UI"`;
  ctx.textAlign = "center";
  ctx.fillText(title, x + w / 2, y + 46);

  ctx.strokeStyle = `${theme.accent}66`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 16, y + 62);
  ctx.lineTo(x + w - 16, y + 62);
  ctx.stroke();
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
