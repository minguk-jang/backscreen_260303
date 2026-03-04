import dayjs from "dayjs";
import type { MealEntry } from "../types";

function parseIsoDate(line: string, monthKey: string): string | null {
  const fullMatch = line.match(/(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
  if (fullMatch) {
    const year = Number(fullMatch[1]);
    const month = Number(fullMatch[2]);
    const day = Number(fullMatch[3]);
    const value = dayjs(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    return value.isValid() ? value.format("YYYY-MM-DD") : null;
  }

  const shortMatch = line.match(/(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
  if (shortMatch) {
    const [yearToken, monthToken] = monthKey.split("-").map(Number);
    const fallbackYear = Number.isFinite(yearToken) ? yearToken : dayjs().year();
    const fallbackMonth = Number.isFinite(monthToken) ? monthToken : dayjs().month() + 1;
    const month = Number(shortMatch[1]);
    const day = Number(shortMatch[2]);
    const normalizedMonth = Number.isFinite(month) ? month : fallbackMonth;
    const value = dayjs(
      `${fallbackYear}-${String(normalizedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    );
    return value.isValid() ? value.format("YYYY-MM-DD") : null;
  }

  return null;
}

function parseMealLine(line: string): string[] {
  return line
    .split(/[|,·/]/g)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length > 0);
}

export function parseMealDocumentText(text: string, monthKey: string): MealEntry[] {
  const lines = text
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const grouped: Array<{ date: string; items: string[] }> = [];
  let currentDate: string | null = null;
  let currentItems: string[] = [];

  const flush = () => {
    if (!currentDate || currentItems.length === 0) {
      return;
    }
    grouped.push({
      date: currentDate,
      items: Array.from(new Set(currentItems))
    });
  };

  for (const line of lines) {
    const nextDate = parseIsoDate(line, monthKey);
    if (nextDate) {
      flush();
      currentDate = nextDate;
      currentItems = [];
      continue;
    }

    if (!currentDate) {
      continue;
    }
    currentItems.push(...parseMealLine(line));
  }

  flush();

  const byDate = new Map<string, string[]>();
  for (const entry of grouped) {
    byDate.set(entry.date, entry.items);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items], index) => ({
      id: `import-${date}-${index}`,
      date,
      items
    }));
}
