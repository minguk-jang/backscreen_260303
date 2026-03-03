import dayjs from "dayjs";
import type { AppState, TimetableSlot, Weekday } from "./types";

const dayMap: Record<number, Weekday | null> = {
  0: null,
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: null
};

function minuteOf(time: string): number | null {
  const [hh, mm] = time.split(":").map((value) => Number(value));
  if (Number.isNaN(hh) || Number.isNaN(mm)) {
    return null;
  }

  return hh * 60 + mm;
}

export function getCurrentClass(state: AppState, now = dayjs()): TimetableSlot | null {
  const weekday = dayMap[now.day()];
  if (!weekday) {
    return null;
  }

  const currentMinute = now.hour() * 60 + now.minute();
  const slots = state.timetable[weekday];

  for (const slot of slots) {
    const start = minuteOf(slot.start);
    const end = minuteOf(slot.end);
    if (start === null || end === null) {
      continue;
    }
    if (currentMinute >= start && currentMinute <= end) {
      return slot;
    }
  }

  return null;
}
