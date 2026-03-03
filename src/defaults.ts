import type { AppState, TimetableSlot, Weekday } from "./types";

const makeSlot = (
  id: string,
  periodLabel: string,
  subject: string,
  start: string,
  end: string
): TimetableSlot => ({
  id,
  periodLabel,
  subject,
  start,
  end
});

const weekdays: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

const defaultDay = (): TimetableSlot[] => [
  makeSlot(crypto.randomUUID(), "1교시", "국어", "09:00", "09:40"),
  makeSlot(crypto.randomUUID(), "2교시", "사회", "09:45", "10:25"),
  makeSlot(crypto.randomUUID(), "3교시", "수학", "10:50", "11:30"),
  makeSlot(crypto.randomUUID(), "4교시", "도덕", "11:35", "12:15")
];

export const defaultState: AppState = {
  schoolInfo: {
    schoolName: "우리학교",
    className: "5학년 1반"
  },
  timetable: weekdays.reduce((acc, day) => {
    acc[day] = defaultDay();
    return acc;
  }, {} as AppState["timetable"]),
  meals: [
    {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      items: ["기장밥", "북어콩나물국", "소불고기", "깍두기"]
    }
  ],
  events: [
    {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      title: "대체휴무",
      details: "학교 휴업일",
      color: "#f59e0b"
    }
  ],
  theme: {
    background: "#f7bfd5",
    panel: "#fff3f7",
    panelAlt: "#ffffff",
    primaryText: "#7f184c",
    accent: "#cf1f72"
  },
  autoApplyEveryMinute: true
};

export const weekdayOptions: Array<{ key: Weekday; label: string }> = [
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" }
];
