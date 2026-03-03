import dayjs from "dayjs";
import type { AppState } from "../types";

export interface ChecklistItem {
  key: "school" | "meal" | "event" | "apply";
  label: string;
  done: boolean;
}

export interface ChecklistResult {
  items: ChecklistItem[];
  completed: number;
  total: number;
}

export function buildSetupChecklist(
  state: AppState,
  nowISO: string,
  hasAppliedOnce: boolean
): ChecklistResult {
  const monthKey = dayjs(nowISO).format("YYYY-MM");
  const hasSchool = Boolean(state.schoolInfo.schoolName.trim() && state.schoolInfo.className.trim());
  const hasMeal = state.meals.some((entry) => entry.date.startsWith(monthKey));
  const hasEvent = state.events.some((entry) => entry.date.startsWith(monthKey));

  const items: ChecklistItem[] = [
    { key: "school", label: "학교 정보 입력", done: hasSchool },
    { key: "meal", label: "이번 달 급식 등록", done: hasMeal },
    { key: "event", label: "이번 달 일정 등록", done: hasEvent },
    { key: "apply", label: "배경 적용 1회", done: hasAppliedOnce }
  ];

  const completed = items.filter((item) => item.done).length;
  return { items, completed, total: items.length };
}
