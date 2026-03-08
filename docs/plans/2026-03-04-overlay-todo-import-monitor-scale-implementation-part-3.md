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
