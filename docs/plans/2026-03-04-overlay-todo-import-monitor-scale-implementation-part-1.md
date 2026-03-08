# Overlay Todo + Meal Import + Display Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 정적 배경 파이프라인을 유지하면서, 스튜디오에서 Todo/급식 업로드/모니터 대상/콘텐츠 스케일을 설정하고 바탕화면 위젯에서 Todo 체크 인터랙션을 제공한다.

**Architecture:** 기존 `AppState`에 Todo/Display/Import 메타를 확장하고, UI는 `QuickMonthlyEditor` 제거 후 `TodoPanel`, `DisplaySettingsPanel`, `MealImportPanel`을 추가한다. 배경 적용은 Rust에서 모니터 목록 조회 + 대상 선택 적용으로 확장하고, Todo 체크 인터랙션은 별도 위젯 창(동일 프런트 코드의 widget 모드)으로 분리한다.

**Tech Stack:** React + TypeScript + Vite + Vitest, Tauri v2 + Rust, 기존 `renderWallpaper` 유틸 구조

---

### Task 1: AppState 확장 (Todo/Display/Import 메타)

**Files:**
- Modify: `src/types.ts`
- Modify: `src/defaults.ts`
- Modify: `src/App.tsx`
- Test: `src/utils/validation.test.ts`

**Step 1: Write the failing test**

```ts
it("validates content scale and todo text", () => {
  const issues = validateState({
    ...defaultState,
    display: { monitorMode: "primary", contentScalePercent: 150 },
    todos: [{ id: "t1", text: "", done: false, order: 1, createdAt: "2026-03-04T09:00:00Z" }]
  });

  expect(issues.some((i) => i.field.includes("contentScalePercent"))).toBe(true);
  expect(issues.some((i) => i.field.includes("todos"))).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/validation.test.ts`  
Expected: FAIL (`display`/`todos` 필드 미정의 또는 검증 미구현)

**Step 3: Write minimal implementation**

```ts
// types.ts
export interface TodoEntry { /* ... */ }
export interface DisplaySettings { /* ... */ }
export interface MealImportSettings { /* ... */ }

export interface AppState {
  // existing...
  todos: TodoEntry[];
  display: DisplaySettings;
  mealImport: MealImportSettings;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/utils/validation.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/types.ts src/defaults.ts src/App.tsx src/utils/validation.test.ts src/utils/validation.ts
git commit -m "feat: extend app state with todo display and import metadata"
```

### Task 2: Todo 정렬/토글 유틸 추가

**Files:**
- Create: `src/utils/todos.ts`
- Create: `src/utils/todos.test.ts`

**Step 1: Write the failing test**

```ts
it("moves checked todo to bottom with done style order", () => {
  const items = [
    { id: "a", text: "A", done: false, order: 1, createdAt: "2026-03-04T00:00:00Z" },
    { id: "b", text: "B", done: false, order: 2, createdAt: "2026-03-04T00:00:00Z" }
  ];
  const next = toggleTodo(items, "a", true);
  expect(next[0].id).toBe("b");
  expect(next[next.length - 1].id).toBe("a");
  expect(next[next.length - 1].done).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/todos.test.ts`  
Expected: FAIL (`toggleTodo` 미구현)

**Step 3: Write minimal implementation**

```ts
export function sortTodos(items: TodoEntry[]): TodoEntry[] { /* 미완료 우선 + order */ }
export function toggleTodo(items: TodoEntry[], id: string, done: boolean): TodoEntry[] { /* doneAt + reorder */ }
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/utils/todos.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/todos.ts src/utils/todos.test.ts
git commit -m "feat: add todo toggle and ordering utilities"
```

### Task 3: QuickMonthlyEditor 제거 + TodoPanel 추가

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Create: `src/components/TodoPanel.tsx`
- Test: `src/components/AppLayout.test.tsx`

**Step 1: Write the failing test**

```ts
it("does not render quick monthly editor and shows todo panel", async () => {
  render(<App />);
  expect(screen.queryByText("이번 달 빠른 수정")).toBeNull();
  expect(await screen.findByRole("heading", { name: "Todo 관리" })).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/AppLayout.test.tsx`  
Expected: FAIL (기존 QuickMonthlyEditor 노출)

**Step 3: Write minimal implementation**

```tsx
// App.tsx
// remove <QuickMonthlyEditor ... />
<TodoPanel todos={state.todos} onAddTodo={onAddTodo} onDeleteTodo={onDeleteTodo} />
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/AppLayout.test.tsx`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/App.tsx src/styles.css src/components/TodoPanel.tsx src/components/AppLayout.test.tsx
git commit -m "feat: replace quick monthly editor with todo management panel"
```

### Task 4: DisplaySettingsPanel 추가 (모니터 대상 + 콘텐츠 스케일)

**Files:**
- Create: `src/components/DisplaySettingsPanel.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/ResponsiveLayout.test.tsx`

**Step 1: Write the failing test**

```ts
it("renders display settings controls", async () => {
  render(<App />);
  expect(await screen.findByRole("heading", { name: "디스플레이 설정" })).toBeInTheDocument();
  expect(screen.getByLabelText("콘텐츠 크기")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/ResponsiveLayout.test.tsx`  
Expected: FAIL (`디스플레이 설정` 패널 미존재)

**Step 3: Write minimal implementation**

```tsx
<DisplaySettingsPanel
  settings={state.display}
  monitors={monitors}
  onChangeMonitorMode={...}
  onChangeMonitorId={...}
  onChangeScale={...}
/>
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/ResponsiveLayout.test.tsx`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/DisplaySettingsPanel.tsx src/App.tsx src/components/ResponsiveLayout.test.tsx
git commit -m "feat: add display settings panel with monitor target and scale controls"
```

### Task 5: 바탕화면 렌더에 콘텐츠 스케일 반영

**Files:**
- Modify: `src/renderWallpaper.ts`
- Modify: `src/renderWallpaper.test.ts`
- Modify: `src/wallpaper/layout.ts`

**Step 1: Write the failing test**

```ts
it("applies content scale without overflow on 1366x768", () => {
  const state = { ...defaultState, display: { ...defaultState.display, contentScalePercent: 130 } };
  const data = renderWallpaperImage(state, 1366, 768);
  expect(data.startsWith("data:image/png;base64,")).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/renderWallpaper.test.ts`  
Expected: FAIL (`display` 스케일 반영 미구현 또는 타입 오류)

**Step 3: Write minimal implementation**

```ts
const scale = clamp(state.display.contentScalePercent / 100, 0.8, 1.3);
const scaledLayout = computeLayout(width, height, scale);
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/renderWallpaper.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderWallpaper.ts src/renderWallpaper.test.ts src/wallpaper/layout.ts
git commit -m "feat: support content scale setting in wallpaper renderer"
```

