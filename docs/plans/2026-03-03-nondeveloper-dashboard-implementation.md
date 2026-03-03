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

### Task 5: Introduce `useAppState` Hook for Load/Save/Apply Actions

**Files:**
- Create: `src/hooks/useAppState.ts`
- Create: `src/hooks/useAppState.test.ts`
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

```ts
// src/hooks/useAppState.test.ts
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { useAppState } from "./useAppState";

describe("useAppState", () => {
  it("exposes saveAndApply action", () => {
    const { result } = renderHook(() => useAppState());
    expect(typeof result.current.saveAndApply).toBe("function");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/hooks/useAppState.test.ts`  
Expected: FAIL because hook does not exist.

**Step 3: Write minimal implementation**

```ts
// src/hooks/useAppState.ts
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { defaultState } from "../defaults";
import type { AppState } from "../types";

export function useAppState() {
  const [state, setState] = useState<AppState>(defaultState);

  async function save() {
    await invoke("save_app_state", { state });
  }

  async function saveAndApply() {
    await save();
    // apply function to be connected in later task
  }

  return { state, setState, save, saveAndApply };
}
```

Then wire `App.tsx` to use this hook incrementally (no behavior change yet).

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/hooks/useAppState.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/hooks/useAppState.ts src/hooks/useAppState.test.ts src/App.tsx
git commit -m "refactor: introduce app state hook for side-effect actions"
```

### Task 6: Build Setup Checklist Component

**Files:**
- Create: `src/components/SetupChecklist.tsx`
- Create: `src/components/SetupChecklist.test.tsx`
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/SetupChecklist.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SetupChecklist } from "./SetupChecklist";

describe("SetupChecklist", () => {
  it("shows progress text", () => {
    render(
      <SetupChecklist
        completed={2}
        total={4}
        items={[
          { key: "school", label: "학교 정보 입력", done: true },
          { key: "meal", label: "이번 달 급식 등록", done: true },
          { key: "event", label: "이번 달 일정 등록", done: false },
          { key: "apply", label: "배경 적용 1회", done: false }
        ]}
      />
    );

    expect(screen.getByText("진행률 2/4")).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/SetupChecklist.test.tsx`  
Expected: FAIL because component does not exist.

**Step 3: Write minimal implementation**

```tsx
// src/components/SetupChecklist.tsx
import type { ChecklistItem } from "../utils/checklist";

interface Props {
  items: ChecklistItem[];
  completed: number;
  total: number;
}

export function SetupChecklist({ items, completed, total }: Props) {
  return (
    <section className="setup-checklist" aria-label="초기 설정 체크리스트">
      <strong>{`진행률 ${completed}/${total}`}</strong>
      <ul>
        {items.map((item) => (
          <li key={item.key} data-done={item.done}>
            {item.done ? "완료" : "미완료"} {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

Then render component near top of `App.tsx`.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/SetupChecklist.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/SetupChecklist.tsx src/components/SetupChecklist.test.tsx src/App.tsx
git commit -m "feat: add setup checklist component and progress header"
```

### Task 7: Build Monthly Quick Editor Component (Meals + Events)

**Files:**
- Create: `src/components/QuickMonthlyEditor.tsx`
- Create: `src/components/QuickMonthlyEditor.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/utils/monthlyData.ts`

**Step 1: Write the failing test**

```tsx
// src/components/QuickMonthlyEditor.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuickMonthlyEditor } from "./QuickMonthlyEditor";

describe("QuickMonthlyEditor", () => {
  it("calls onQuickAddEvent with date and title", () => {
    const onQuickAddEvent = vi.fn();

    render(
      <QuickMonthlyEditor
        monthKey="2026-03"
        meals={[]}
        events={[]}
        onQuickAddEvent={onQuickAddEvent}
        onQuickAddMeal={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("일정 날짜"), { target: { value: "2026-03-10" } });
    fireEvent.change(screen.getByLabelText("일정 제목"), { target: { value: "학부모 상담" } });
    fireEvent.click(screen.getByRole("button", { name: "일정 빠른 추가" }));

    expect(onQuickAddEvent).toHaveBeenCalledWith("2026-03-10", "학부모 상담");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/QuickMonthlyEditor.test.tsx`  
Expected: FAIL because component does not exist.

**Step 3: Write minimal implementation**

```tsx
// src/components/QuickMonthlyEditor.tsx
import { useState } from "react";
import type { EventEntry, MealEntry } from "../types";

interface Props {
  monthKey: string;
  meals: MealEntry[];
  events: EventEntry[];
  onQuickAddEvent: (date: string, title: string) => void;
  onQuickAddMeal: (date: string, itemsText: string) => void;
}

export function QuickMonthlyEditor({ monthKey, meals, events, onQuickAddEvent, onQuickAddMeal }: Props) {
  const [eventDate, setEventDate] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [mealDate, setMealDate] = useState("");
  const [mealItems, setMealItems] = useState("");

  return (
    <section aria-label="이번 달 빠른 수정">
      <h2>이번 달 빠른 수정 ({monthKey})</h2>
      <label>일정 날짜<input value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></label>
      <label>일정 제목<input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} /></label>
      <button onClick={() => onQuickAddEvent(eventDate, eventTitle)}>일정 빠른 추가</button>

      <label>급식 날짜<input value={mealDate} onChange={(e) => setMealDate(e.target.value)} /></label>
      <label>급식 메뉴<textarea value={mealItems} onChange={(e) => setMealItems(e.target.value)} /></label>
      <button onClick={() => onQuickAddMeal(mealDate, mealItems)}>급식 빠른 추가</button>

      <p>{`이번 달 일정 ${events.length}건 / 급식 ${meals.length}건`}</p>
    </section>
  );
}
```

Then wire callbacks in `App.tsx` to update state using `upsertMealByDate` and event append/update helpers.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/QuickMonthlyEditor.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/QuickMonthlyEditor.tsx src/components/QuickMonthlyEditor.test.tsx src/utils/monthlyData.ts src/App.tsx
git commit -m "feat: add monthly quick editor for events and meals"
```

### Task 8: Split Remaining Panels and Keep Timetable Collapsed by Default

**Files:**
- Create: `src/components/SchoolInfoPanel.tsx`
- Create: `src/components/TimetablePanel.tsx`
- Create: `src/components/ThemePanel.tsx`
- Create: `src/components/StatusBar.tsx`
- Create: `src/components/AppLayout.test.tsx`
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/AppLayout.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../App";

describe("App layout", () => {
  it("renders timetable collapsed helper text", () => {
    render(<App />);
    expect(screen.getByText("시간표는 학기 시작 시 1회 수정하면 됩니다.")).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/AppLayout.test.tsx`  
Expected: FAIL because helper text and new panel structure do not exist.

**Step 3: Write minimal implementation**

- Move each right-column section into dedicated component.
- In `TimetablePanel`, add internal `expanded` state default `false`.
- Show collapsed callout text and toggle button.

```tsx
// TimetablePanel.tsx (core behavior)
const [expanded, setExpanded] = useState(false);
return (
  <section>
    <p>시간표는 학기 시작 시 1회 수정하면 됩니다.</p>
    <button onClick={() => setExpanded((v) => !v)}>{expanded ? "접기" : "펼치기"}</button>
    {expanded ? <TimetableEditor ... /> : null}
  </section>
);
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/AppLayout.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/SchoolInfoPanel.tsx src/components/TimetablePanel.tsx src/components/ThemePanel.tsx src/components/StatusBar.tsx src/components/AppLayout.test.tsx src/App.tsx
git commit -m "refactor: split dashboard panels and collapse timetable by default"
```

### Task 9: Redesign CSS for Guided Dashboard and Responsive Layout

**Files:**
- Modify: `src/styles.css`
- Create: `src/components/ResponsiveLayout.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/ResponsiveLayout.test.tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../App";

describe("responsive layout classes", () => {
  it("applies dashboard root class", () => {
    const { container } = render(<App />);
    expect(container.querySelector(".dashboard-grid")).not.toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/ResponsiveLayout.test.tsx`  
Expected: FAIL because new class is not present.

**Step 3: Write minimal implementation**

- Add `.dashboard-grid`, `.left-rail`, `.right-rail`, `.setup-checklist`, `.quick-editor` classes.
- Add media query:

```css
@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
```

- Ensure color contrast for guidance text and status messages.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/ResponsiveLayout.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/styles.css src/components/ResponsiveLayout.test.tsx src/App.tsx
git commit -m "style: implement guided dashboard layout and responsive behavior"
```

### Task 10: Refine Wallpaper Rendering to Match Reference Readability

**Files:**
- Modify: `src/renderWallpaper.ts`
- Create: `src/renderWallpaper.test.ts`

**Step 1: Write the failing test**

```ts
// src/renderWallpaper.test.ts
import { describe, expect, it } from "vitest";
import { defaultState } from "./defaults";
import { renderWallpaperImage } from "./renderWallpaper";

describe("renderWallpaperImage", () => {
  it("returns png data url", () => {
    const data = renderWallpaperImage(defaultState, 1920, 1080);
    expect(data.startsWith("data:image/png;base64,")).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/renderWallpaper.test.ts`  
Expected: FAIL in jsdom if canvas APIs are not ready.

**Step 3: Write minimal implementation**

- Add canvas mock setup in `src/test/setup.ts` if needed.
- Improve `renderWallpaper.ts` typography spacing and panel card heights without changing data contracts.
- Keep top banner + three-column panel architecture.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/renderWallpaper.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderWallpaper.ts src/renderWallpaper.test.ts src/test/setup.ts
git commit -m "feat: improve wallpaper readability while keeping existing data model"
```

### Task 11: Final Verification and Documentation Updates

**Files:**
- Modify: `README.md`
- Create: `docs/plans/2026-03-03-nondeveloper-dashboard-qa-checklist.md`

**Step 1: Write the failing test/checklist condition**

Create QA checklist with explicit pass/fail items:
- first-time setup under 10 minutes
- monthly event edit under 20 seconds
- monthly meal edit under 30 seconds
- save/apply success and failure guidance clarity

**Step 2: Run verification to show gaps**

Run:
- `npm run test`
- `npm run build`
- `npm run tauri dev` (manual smoke)

Expected: if any failure exists, record exact failure in QA checklist.

**Step 3: Write minimal implementation/documentation**

- Update README with new dashboard flow and "monthly quick edit" usage guide.
- Fill QA checklist with measured results.

**Step 4: Re-run verification**

Run again:
- `npm run test`
- `npm run build`

Expected: PASS for automated checks; manual checklist completed.

**Step 5: Commit**

```bash
git add README.md docs/plans/2026-03-03-nondeveloper-dashboard-qa-checklist.md
git commit -m "docs: add guided dashboard usage and QA verification results"
```

## Execution Notes

- Apply `@superpowers:test-driven-development` for each task.
- Apply `@superpowers:systematic-debugging` for any red test or runtime issue before patching.
- Apply `@superpowers:verification-before-completion` before final completion claim.
- Keep each commit scoped to one task only.
