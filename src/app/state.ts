import dayjs from "dayjs";
import { defaultState } from "../defaults";
import type { AppState, EventEntry, MealEntry, TimetableSlot, TodoEntry, Weekday } from "../types";
import { deepCloneState } from "./storage";

function mergeTimetableSlot(slot: Partial<TimetableSlot>, fallbackId: string): TimetableSlot {
  return {
    id: slot.id ?? fallbackId,
    periodLabel: slot.periodLabel ?? "",
    subject: slot.subject ?? "",
    start: slot.start ?? "09:00",
    end: slot.end ?? "09:40"
  };
}

function mergeMealEntry(meal: Partial<MealEntry>): MealEntry {
  return {
    id: meal.id ?? crypto.randomUUID(),
    date: meal.date ?? dayjs().format("YYYY-MM-DD"),
    items: Array.isArray(meal.items) ? meal.items : []
  };
}

function mergeEventEntry(entry: Partial<EventEntry>): EventEntry {
  return {
    id: entry.id ?? crypto.randomUUID(),
    date: entry.date ?? dayjs().format("YYYY-MM-DD"),
    title: entry.title ?? "",
    details: entry.details ?? "",
    color: entry.color ?? "#f59e0b"
  };
}

function mergeTodoEntry(todo: Partial<TodoEntry>, index: number): TodoEntry {
  return {
    id: todo.id ?? crypto.randomUUID(),
    text: todo.text ?? "",
    done: Boolean(todo.done),
    order: typeof todo.order === "number" && Number.isFinite(todo.order) ? todo.order : index + 1,
    createdAt: todo.createdAt ?? new Date().toISOString(),
    doneAt: todo.doneAt
  };
}

export function mergeWithDefaults(incoming: AppState): AppState {
  const next = deepCloneState(defaultState);

  if (incoming.schoolInfo) {
    next.schoolInfo = {
      schoolName: incoming.schoolInfo.schoolName ?? next.schoolInfo.schoolName,
      className: incoming.schoolInfo.className ?? next.schoolInfo.className
    };
  }

  if (incoming.timetable) {
    for (const day of Object.keys(next.timetable) as Weekday[]) {
      const slots = incoming.timetable[day];
      if (Array.isArray(slots)) {
        next.timetable[day] = slots.map((slot) => mergeTimetableSlot(slot, crypto.randomUUID()));
      }
    }
  }

  if (Array.isArray(incoming.meals)) {
    next.meals = incoming.meals.map(mergeMealEntry);
  }

  if (Array.isArray(incoming.events)) {
    next.events = incoming.events.map(mergeEventEntry);
  }

  if (Array.isArray(incoming.todos)) {
    next.todos = incoming.todos.map(mergeTodoEntry);
  }

  if (incoming.display) {
    next.display = {
      monitorMode:
        incoming.display.monitorMode === "all" ||
        incoming.display.monitorMode === "primary" ||
        incoming.display.monitorMode === "single"
          ? incoming.display.monitorMode
          : next.display.monitorMode,
      monitorId: incoming.display.monitorId ?? next.display.monitorId,
      contentScalePercent:
        typeof incoming.display.contentScalePercent === "number"
          ? incoming.display.contentScalePercent
          : next.display.contentScalePercent,
      offsetXPercent:
        typeof incoming.display.offsetXPercent === "number"
          ? incoming.display.offsetXPercent
          : next.display.offsetXPercent,
      offsetYPercent:
        typeof incoming.display.offsetYPercent === "number"
          ? incoming.display.offsetYPercent
          : next.display.offsetYPercent
    };
  }

  if (incoming.mealImport) {
    next.mealImport = {
      lastImportedAt: incoming.mealImport.lastImportedAt ?? next.mealImport.lastImportedAt,
      lastSourceType: incoming.mealImport.lastSourceType ?? next.mealImport.lastSourceType,
      lastFileName: incoming.mealImport.lastFileName ?? next.mealImport.lastFileName
    };
  }

  if (incoming.theme) {
    next.theme = {
      background: incoming.theme.background ?? next.theme.background,
      panel: incoming.theme.panel ?? next.theme.panel,
      panelAlt: incoming.theme.panelAlt ?? next.theme.panelAlt,
      primaryText: incoming.theme.primaryText ?? next.theme.primaryText,
      accent: incoming.theme.accent ?? next.theme.accent
    };
  }

  if (typeof incoming.autoApplyEveryMinute === "boolean") {
    next.autoApplyEveryMinute = incoming.autoApplyEveryMinute;
  }

  return next;
}
