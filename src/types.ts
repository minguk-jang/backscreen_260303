export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

export interface ThemeSettings {
  background: string;
  panel: string;
  panelAlt: string;
  primaryText: string;
  accent: string;
}

export interface SchoolInfo {
  schoolName: string;
  className: string;
}

export interface TimetableSlot {
  id: string;
  periodLabel: string;
  subject: string;
  start: string;
  end: string;
}

export type Timetable = Record<Weekday, TimetableSlot[]>;

export interface MealEntry {
  id: string;
  date: string;
  items: string[];
}

export interface EventEntry {
  id: string;
  date: string;
  title: string;
  details: string;
  color: string;
}

export interface AppState {
  schoolInfo: SchoolInfo;
  timetable: Timetable;
  meals: MealEntry[];
  events: EventEntry[];
  theme: ThemeSettings;
  autoApplyEveryMinute: boolean;
}
