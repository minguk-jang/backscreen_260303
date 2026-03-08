# Non-Developer Dashboard UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the editor into a guided one-screen dashboard so non-developers can finish first setup within 10 minutes and update monthly meals/events quickly.

**Architecture:** Keep the existing Tauri persistence and wallpaper pipeline, but split `src/App.tsx` into focused UI components and utility modules. Put monthly editing, checklist progress, and validation messaging into testable pure modules. Preserve existing data model compatibility and add only minimal state needed for guided UX.

**Tech Stack:** React 18 + TypeScript + Vite, Tauri v2, Vitest + Testing Library (new), dayjs.

---

### Task 1: Add Frontend Test Harness

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/currentClass.test.ts`

**Step 1: Write the failing test**

```ts
// src/currentClass.test.ts
import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import { defaultState } from "./defaults";
import { getCurrentClass } from "./currentClass";

describe("getCurrentClass", () => {
  it("returns first slot during Monday first period", () => {
    const now = dayjs("2026-03-02T09:10:00");
    const current = getCurrentClass(defaultState, now);
    expect(current?.periodLabel).toBe("1교시");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/currentClass.test.ts`  
Expected: FAIL with missing `test` script / test runner not configured.

**Step 3: Write minimal implementation**

```json
// package.json (scripts)
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"]
  }
});
```

```ts
// src/test/setup.ts
import "@testing-library/jest-dom/vitest";
```

Also install:  
`npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom`

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/currentClass.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test/setup.ts src/currentClass.test.ts
git commit -m "test: add vitest harness and current class baseline test"
```

### Task 2: Extract Validation Logic into Utility Module

**Files:**
- Create: `src/utils/validation.ts`
- Create: `src/utils/validation.test.ts`
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

```ts
// src/utils/validation.test.ts
import { describe, expect, it } from "vitest";
import { defaultState } from "../defaults";
import { validateState } from "./validation";

describe("validateState", () => {
  it("returns actionable message when event title is empty", () => {
    const state = {
      ...defaultState,
      events: [{ ...defaultState.events[0], title: "" }]
    };

    const issues = validateState(state);
    expect(issues[0].message).toContain("일정 제목");
    expect(issues[0].fix).toContain("제목을 입력");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/validation.test.ts`  
Expected: FAIL because `validation.ts` does not exist.

**Step 3: Write minimal implementation**

```ts
// src/utils/validation.ts
import type { AppState, Weekday } from "../types";

export interface ValidationIssue {
  path: string;
  message: string;
  fix: string;
}

const dayLabel: Record<Weekday, string> = {
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금"
};

export function validateState(state: AppState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const day of ["mon", "tue", "wed", "thu", "fri"] as Weekday[]) {
    for (const slot of state.timetable[day]) {
      if (!slot.subject.trim()) {
        issues.push({
          path: `timetable.${day}.${slot.id}.subject`,
          message: `${dayLabel[day]}요일 ${slot.periodLabel} 과목명이 비어 있습니다.`,
          fix: "과목명을 입력해 주세요."
        });
      }
    }
  }

  for (const event of state.events) {
    if (!event.title.trim()) {
      issues.push({
        path: `events.${event.id}.title`,
        message: "일정 제목이 비어 있습니다.",
        fix: "일정 제목을 입력해 주세요."
      });
      break;
    }
  }

  return issues;
}
```

Then replace in `src/App.tsx`: existing `validateState` call with utility import and use `issues[0].message + issues[0].fix` for status line.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/utils/validation.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/utils/validation.ts src/utils/validation.test.ts src/App.tsx
git commit -m "refactor: move validation into reusable utility with actionable messages"
```

### Task 3: Add Checklist Progress Utility

**Files:**
- Create: `src/utils/checklist.ts`
- Create: `src/utils/checklist.test.ts`

**Step 1: Write the failing test**

```ts
// src/utils/checklist.test.ts
import { describe, expect, it } from "vitest";
import { defaultState } from "../defaults";
import { buildSetupChecklist } from "./checklist";

describe("buildSetupChecklist", () => {
  it("marks monthly meal/event steps complete when current month has entries", () => {
    const now = "2026-03-03";
    const result = buildSetupChecklist(defaultState, now, true);
    expect(result.total).toBe(4);
    expect(result.completed).toBeGreaterThanOrEqual(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/checklist.test.ts`  
Expected: FAIL because `buildSetupChecklist` does not exist.

**Step 3: Write minimal implementation**

```ts
// src/utils/checklist.ts
import dayjs from "dayjs";
import type { AppState } from "../types";

export interface ChecklistItem {
  key: "school" | "meal" | "event" | "apply";
  label: string;
  done: boolean;
}

export function buildSetupChecklist(
  state: AppState,
  nowISO: string,
  hasAppliedOnce: boolean
): { items: ChecklistItem[]; completed: number; total: number } {
  const monthKey = dayjs(nowISO).format("YYYY-MM");
  const hasSchool = Boolean(state.schoolInfo.schoolName.trim() && state.schoolInfo.className.trim());
  const hasMeal = state.meals.some((m) => m.date.startsWith(monthKey));
  const hasEvent = state.events.some((e) => e.date.startsWith(monthKey));

  const items: ChecklistItem[] = [
    { key: "school", label: "학교 정보 입력", done: hasSchool },
    { key: "meal", label: "이번 달 급식 등록", done: hasMeal },
    { key: "event", label: "이번 달 일정 등록", done: hasEvent },
    { key: "apply", label: "배경 적용 1회", done: hasAppliedOnce }
  ];

  const completed = items.filter((i) => i.done).length;
  return { items, completed, total: items.length };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/utils/checklist.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/utils/checklist.ts src/utils/checklist.test.ts
git commit -m "feat: add setup checklist progress utility"
```

### Task 4: Add Monthly Editor Utility Functions

**Files:**
- Create: `src/utils/monthlyData.ts`
- Create: `src/utils/monthlyData.test.ts`

**Step 1: Write the failing test**

```ts
// src/utils/monthlyData.test.ts
import { describe, expect, it } from "vitest";
import { upsertMealByDate } from "./monthlyData";

describe("upsertMealByDate", () => {
  it("overwrites existing meal with same date", () => {
    const next = upsertMealByDate(
      [{ id: "1", date: "2026-03-03", items: ["A"] }],
      { id: "2", date: "2026-03-03", items: ["B"] }
    );
    expect(next).toHaveLength(1);
    expect(next[0].items).toEqual(["B"]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/monthlyData.test.ts`  
Expected: FAIL because module does not exist.

**Step 3: Write minimal implementation**

```ts
// src/utils/monthlyData.ts
import type { EventEntry, MealEntry } from "../types";

export function inMonth(date: string, monthKey: string): boolean {
  return date.startsWith(monthKey);
}

export function filterMealsByMonth(meals: MealEntry[], monthKey: string): MealEntry[] {
  return meals.filter((m) => inMonth(m.date, monthKey));
}

export function filterEventsByMonth(events: EventEntry[], monthKey: string): EventEntry[] {
  return events.filter((e) => inMonth(e.date, monthKey));
}

export function upsertMealByDate(meals: MealEntry[], incoming: MealEntry): MealEntry[] {
  const idx = meals.findIndex((m) => m.date === incoming.date);
  if (idx < 0) return [...meals, incoming];
  const copy = [...meals];
  copy[idx] = incoming;
  return copy;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/utils/monthlyData.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/utils/monthlyData.ts src/utils/monthlyData.test.ts
git commit -m "feat: add month filtering and meal upsert utilities"
```

