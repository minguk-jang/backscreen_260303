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

### Task 6: Rust 모니터 조회/대상 선택 명령 추가

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Create: `src-tauri/src/display_target.rs`
- Test: `src-tauri/src/display_target.rs` (unit tests)

**Step 1: Write the failing test**

```rust
#[test]
fn falls_back_to_primary_when_single_monitor_id_missing() {
    let monitors = vec![mock_monitor("primary", true), mock_monitor("secondary", false)];
    let target = resolve_targets("single", Some("missing".into()), &monitors);
    assert_eq!(target, vec!["primary".to_string()]);
}
```

**Step 2: Run test to verify it fails**

Run: `cd src-tauri && cargo test display_target`  
Expected: FAIL (`resolve_targets` 미구현)

**Step 3: Write minimal implementation**

```rust
pub fn resolve_targets(mode: &str, single_id: Option<String>, monitors: &[MonitorInfo]) -> Vec<String> {
    // all | primary | single + fallback
}
```

**Step 4: Run test to verify it passes**

Run: `cd src-tauri && cargo test display_target`  
Expected: PASS

**Step 5: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/src/display_target.rs
git commit -m "feat: add monitor target resolution for wallpaper apply"
```

### Task 7: Frontend-Backend 연결 (모니터 목록 로드 + apply 인자 확장)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/types.ts`
- Test: `src/components/AppLayout.test.tsx`

**Step 1: Write the failing test**

```ts
it("calls apply_wallpaper_image with display target payload", async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: "지금 배경 적용" }));
  await waitFor(() => {
    expect(invokeMock).toHaveBeenCalledWith("apply_wallpaper_image", expect.objectContaining({
      pngBase64: expect.any(String),
      monitorMode: expect.any(String)
    }));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/AppLayout.test.tsx`  
Expected: FAIL (기존 커맨드 인자에 모니터 정보 없음)

**Step 3: Write minimal implementation**

```ts
await invoke("apply_wallpaper_image", {
  pngBase64,
  monitorMode: state.display.monitorMode,
  monitorId: state.display.monitorId ?? null
});
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/AppLayout.test.tsx`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/App.tsx src/types.ts src/components/AppLayout.test.tsx
git commit -m "feat: pass display target settings to wallpaper apply command"
```

### Task 8: Widget 모드 UI 추가 및 Todo 체크 인터랙션 연결

**Files:**
- Create: `src/components/TodoWidget.tsx`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/TodoWidget.test.tsx`

**Step 1: Write the failing test**

```ts
it("strikes through checked todo and keeps delete hidden", () => {
  render(<TodoWidget todos={[{ id: "1", text: "학습지 배부", done: true, order: 2, createdAt: "2026-03-04T00:00:00Z" }]} />);
  expect(screen.getByText("학습지 배부")).toHaveClass("todo-done");
  expect(screen.queryByRole("button", { name: "삭제" })).toBeNull();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/TodoWidget.test.tsx`  
Expected: FAIL (`TodoWidget` 미구현)

**Step 3: Write minimal implementation**

```tsx
if (window.location.search.includes("mode=widget")) {
  return <TodoWidget ... />;
}
return <App />;
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/TodoWidget.test.tsx`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/TodoWidget.tsx src/main.tsx src/App.tsx src/components/TodoWidget.test.tsx
git commit -m "feat: add interactive todo widget mode"
```

### Task 9: 급식 업로드 규칙 파서 구현 (텍스트 -> MealEntry[])

**Files:**
- Create: `src/utils/mealImportParser.ts`
- Create: `src/utils/mealImportParser.test.ts`

**Step 1: Write the failing test**

```ts
it("parses date-grouped meal lines from extracted text", () => {
  const text = "3월 4일\n기장밥\n콩나물국\n3월 5일\n잡곡밥\n미역국";
  const meals = parseMealDocumentText(text, "2026-03");
  expect(meals).toHaveLength(2);
  expect(meals[0].items).toContain("기장밥");
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/mealImportParser.test.ts`  
Expected: FAIL (`parseMealDocumentText` 미구현)

**Step 3: Write minimal implementation**

```ts
export function parseMealDocumentText(text: string, monthKey: string): MealEntry[] {
  // 날짜 토큰 라인 기준으로 블록 분할 후 items 추출
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/utils/mealImportParser.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/mealImportParser.ts src/utils/mealImportParser.test.ts
git commit -m "feat: add rule-based meal document parser"
```

### Task 10: 파일 업로드 UI 연결 (한글/PDF) + 반영 플로우

**Files:**
- Create: `src/components/MealImportPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Test: `src/components/QuickMonthlyEditor.test.tsx` (rename/new) 또는 `src/components/MealImportPanel.test.tsx`

**Step 1: Write the failing test**

```ts
it("shows parse error message when extracted text has no meal data", async () => {
  render(<MealImportPanel onApply={vi.fn()} />);
  // 업로드 시뮬레이션 후
  expect(await screen.findByText("문서 형식에서 급식 날짜/메뉴를 찾지 못했습니다.")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/MealImportPanel.test.tsx`  
Expected: FAIL (패널/메시지 미구현)

**Step 3: Write minimal implementation**

```tsx
<input type="file" accept=".hwp,.hwpx,.pdf" onChange={handleFile} />
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/MealImportPanel.test.tsx`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/MealImportPanel.tsx src/App.tsx src/styles.css src/components/MealImportPanel.test.tsx
git commit -m "feat: add meal document upload and apply flow"
```

### Task 11: Rust 위젯 창 라이프사이클 및 트레이 액션 연결

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tauri.conf.json`
- Test: `src-tauri/src/lib.rs` (unit-level helper tests)

**Step 1: Write the failing test**

```rust
#[test]
fn widget_url_contains_mode_widget() {
    assert_eq!(widget_route_url(), "/?mode=widget");
}
```

**Step 2: Run test to verify it fails**

Run: `cd src-tauri && cargo test widget_url_contains_mode_widget`  
Expected: FAIL (helper 미구현)

**Step 3: Write minimal implementation**

```rust
fn widget_route_url() -> &'static str { "/?mode=widget" }
```

**Step 4: Run test to verify it passes**

Run: `cd src-tauri && cargo test widget_url_contains_mode_widget`  
Expected: PASS

**Step 5: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/tauri.conf.json
git commit -m "feat: configure interactive widget window lifecycle"
```

### Task 12: 최종 검증 + 문서 업데이트

**Files:**
- Modify: `README.md`
- Modify: `distribution/RELEASE_WORKFLOW_KO.md` (존재 시)

**Step 1: Run focused frontend tests**

Run: `npm run test -- src/utils/todos.test.ts src/renderWallpaper.test.ts src/components/AppLayout.test.tsx src/components/TodoWidget.test.tsx src/components/MealImportPanel.test.tsx`  
Expected: PASS

**Step 2: Run Rust tests**

Run: `cd src-tauri && cargo test`  
Expected: PASS

**Step 3: Run build verification**

Run: `npm run build`  
Expected: PASS

**Step 4: Update docs**

```md
- Todo 위젯 사용법
- 모니터 대상 설정 방법
- 급식 업로드 규칙/제약(HWP/HWPX/PDF, OCR 없음)
```

**Step 5: Commit**

```bash
git add README.md distribution/RELEASE_WORKFLOW_KO.md
git commit -m "docs: add usage guide for todo widget and meal import"
```
