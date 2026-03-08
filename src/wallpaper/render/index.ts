import dayjs from "dayjs";
import type { AppState } from "../../types";
import { getCurrentClass } from "../../currentClass";
import { computeLayout, type WallpaperLayout } from "../layout";
import { fillBackdrop } from "./backdrop";
import { drawEventsSection } from "./eventsSection";
import { drawHeaderSection } from "./headerSection";
import { drawMealsAndTodoSection, safeList } from "./mealsSection";
import { drawPanelShell } from "./panel";
import { drawTimetableSection } from "./timetableSection";
import { sortTodosForWallpaper } from "./todoSection";

interface LayoutDisplayInput {
  contentScalePercent: number;
  offsetXPercent: number;
  offsetYPercent: number;
}

export function getWallpaperLayout(
  width: number,
  height: number,
  display?: Partial<LayoutDisplayInput>
): WallpaperLayout {
  const contentScale = Math.max(0.5, Math.min(1.3, (display?.contentScalePercent ?? 100) / 100));
  const offsetXPercent = Number.isFinite(display?.offsetXPercent) ? (display?.offsetXPercent as number) : 0;
  const offsetYPercent = Number.isFinite(display?.offsetYPercent) ? (display?.offsetYPercent as number) : 0;

  return computeLayout(width, height, contentScale, offsetXPercent, offsetYPercent);
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
    .sort((a, b) => a.date.localeCompare(b.date));
  const current = getCurrentClass(state, now);

  fillBackdrop(ctx, width, height, state.theme.background);

  const layout = getWallpaperLayout(width, height, state.display);
  const currentLabel = current ? `${current.subject} 수업 중입니다.` : "현재 수업 시간이 아닙니다.";
  const mealsTodayItems = mealsToday ? safeList(mealsToday.items) : [];
  const sortedTodos = sortTodosForWallpaper(state.todos);

  drawHeaderSection(ctx, layout.header, state, now, currentLabel);

  const timetableBody = drawPanelShell(ctx, layout.columns[0], "요일별 시간표", state.theme);
  const mealsBody = drawPanelShell(ctx, layout.columns[1], "급식 메뉴", state.theme);
  const eventsBody = drawPanelShell(ctx, layout.columns[2], "학교 교육 활동", state.theme);

  drawTimetableSection(ctx, timetableBody, state, now);
  drawMealsAndTodoSection(ctx, mealsBody, state, now, mealsTodayItems, sortedTodos);
  drawEventsSection(ctx, eventsBody, state, now, monthlyEvents);

  return canvas.toDataURL("image/png");
}
