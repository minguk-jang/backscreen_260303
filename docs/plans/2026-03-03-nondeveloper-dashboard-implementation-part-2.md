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

