import type { EventEntry, MealEntry } from "../types";

export function inMonth(date: string, monthKey: string): boolean {
  return date.startsWith(monthKey);
}

export function filterMealsByMonth(meals: MealEntry[], monthKey: string): MealEntry[] {
  return meals.filter((entry) => inMonth(entry.date, monthKey));
}

export function filterEventsByMonth(events: EventEntry[], monthKey: string): EventEntry[] {
  return events.filter((entry) => inMonth(entry.date, monthKey));
}

export function upsertMealByDate(meals: MealEntry[], incoming: MealEntry): MealEntry[] {
  const foundIndex = meals.findIndex((entry) => entry.date === incoming.date);
  if (foundIndex < 0) {
    return [...meals, incoming];
  }

  const next = [...meals];
  next[foundIndex] = incoming;
  return next;
}
