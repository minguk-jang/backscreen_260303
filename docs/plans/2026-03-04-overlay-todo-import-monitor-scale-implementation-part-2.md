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

