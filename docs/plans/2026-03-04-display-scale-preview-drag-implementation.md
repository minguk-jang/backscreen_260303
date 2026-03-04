# Display Scale 50% + Preview Drag Positioning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 콘텐츠 크기 최소값을 50%로 확장하고, 실시간 미리보기 드래그로 조정한 위치를 저장해 실제 바탕화면 적용에도 동일 반영한다.

**Architecture:** `AppState.display`에 오프셋 퍼센트(`offsetXPercent`, `offsetYPercent`)를 추가하고, 레이아웃 계산기(`computeLayout`)가 스케일/오프셋을 함께 처리하도록 확장한다. Studio에서는 `DisplaySettingsPanel`에서 범위(50~130)와 위치 초기화를 제공하고, `WallpaperPreviewPanel` 오버레이 드래그로 오프셋을 조정한다. 최종 렌더는 기존 `renderWallpaperImage -> computeLayout` 공통 경로를 유지해 미리보기와 실적용 일치성을 확보한다.

**Tech Stack:** React + TypeScript + Vitest + Testing Library, 기존 canvas 렌더러(`renderWallpaper.ts`), Tauri frontend invoke 흐름

---

### Task 1: DisplaySettings 데이터 모델 확장과 기본값 반영

**Files:**
- Modify: `src/types.ts`
- Modify: `src/defaults.ts`
- Modify: `src/App.tsx` (`mergeWithDefaults`)
- Test: `src/utils/validation.test.ts`

**Step 1: Write the failing test**

```ts
it("accepts offset fields and keeps backward compatibility", () => {
  const incoming = {
    ...defaultState,
    display: { monitorMode: "primary", contentScalePercent: 100 }
  } as AppState;

  const merged = mergeWithDefaults(incoming);
  expect(merged.display.offsetXPercent).toBe(0);
  expect(merged.display.offsetYPercent).toBe(0);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/validation.test.ts`  
Expected: FAIL (offset 필드 미정의)

**Step 3: Write minimal implementation**

```ts
// types.ts
export interface DisplaySettings {
  monitorMode: MonitorTargetMode;
  monitorId?: string;
  contentScalePercent: number;
  offsetXPercent: number;
  offsetYPercent: number;
}

// defaults.ts
display: {
  monitorMode: "primary",
  contentScalePercent: 100,
  offsetXPercent: 0,
  offsetYPercent: 0
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/utils/validation.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/types.ts src/defaults.ts src/App.tsx src/utils/validation.test.ts
git commit -m "feat: extend display settings with persisted offset percentages"
```

### Task 2: Validation 범위를 50~130으로 조정

**Files:**
- Modify: `src/utils/validation.ts`
- Modify: `src/utils/validation.test.ts`

**Step 1: Write the failing test**

```ts
it("validates content scale in 50~130 range", () => {
  const ok = validateState({
    ...defaultState,
    display: { ...defaultState.display, contentScalePercent: 50 }
  });
  const bad = validateState({
    ...defaultState,
    display: { ...defaultState.display, contentScalePercent: 49 }
  });

  expect(ok.some((i) => i.path.includes("display.contentScalePercent"))).toBe(false);
  expect(bad.some((i) => i.path.includes("display.contentScalePercent"))).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/validation.test.ts`  
Expected: FAIL (기존 80 하한)

**Step 3: Write minimal implementation**

```ts
if (state.display.contentScalePercent < 50 || state.display.contentScalePercent > 130) {
  issues.push({
    path: "display.contentScalePercent",
    message: "콘텐츠 크기(%)는 50~130 범위여야 합니다.",
    fix: "디스플레이 설정에서 콘텐츠 크기를 50~130 사이로 조정해 주세요."
  });
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/utils/validation.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/validation.ts src/utils/validation.test.ts
git commit -m "feat: lower content scale minimum validation to 50 percent"
```

### Task 3: computeLayout에 오프셋 파라미터 추가 및 clamp 보장

**Files:**
- Modify: `src/wallpaper/layout.ts`
- Modify: `src/wallpaper/layout.test.ts`

**Step 1: Write the failing test**

```ts
it("applies offset and clamps content inside viewport", () => {
  const layout = computeLayout(1366, 768, 0.5, 100, -100);
  expect(layout.content.x).toBeGreaterThanOrEqual(0);
  expect(layout.content.y).toBeGreaterThanOrEqual(0);
  expect(layout.content.x + layout.content.w).toBeLessThanOrEqual(1366);
  expect(layout.content.y + layout.content.h).toBeLessThanOrEqual(768);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/wallpaper/layout.test.ts`  
Expected: FAIL (`computeLayout` 시그니처 불일치)

**Step 3: Write minimal implementation**

```ts
export function computeLayout(
  width: number,
  height: number,
  contentScale = 1,
  offsetXPercent = 0,
  offsetYPercent = 0
): WallpaperLayout {
  const offsetX = (baseContent.w - scaledW) * (offsetXPercent / 100);
  const offsetY = (baseContent.h - scaledH) * (offsetYPercent / 100);
  const positionedX = centeredX + offsetX;
  const positionedY = centeredY + offsetY;
  // clamp 유지
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/wallpaper/layout.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/wallpaper/layout.ts src/wallpaper/layout.test.ts
git commit -m "feat: support offset-based layout positioning with viewport clamp"
```

### Task 4: renderWallpaper 경로에서 새 스케일 하한/오프셋 사용

**Files:**
- Modify: `src/renderWallpaper.ts`
- Modify: `src/renderWallpaper.test.ts`

**Step 1: Write the failing test**

```ts
it("renders safely at 50% scale with large offsets", () => {
  const data = renderWallpaperImage(
    {
      ...defaultState,
      display: {
        ...defaultState.display,
        contentScalePercent: 50,
        offsetXPercent: 100,
        offsetYPercent: -100
      }
    },
    1366,
    768
  );

  expect(data.startsWith("data:image/png;base64,")).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/renderWallpaper.test.ts`  
Expected: FAIL (스케일/오프셋 경로 미연동)

**Step 3: Write minimal implementation**

```ts
const contentScale = Math.max(0.5, Math.min(1.3, state.display.contentScalePercent / 100));
const layout = computeLayout(
  width,
  height,
  contentScale,
  state.display.offsetXPercent,
  state.display.offsetYPercent
);
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/renderWallpaper.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderWallpaper.ts src/renderWallpaper.test.ts
git commit -m "feat: apply persisted drag offsets in wallpaper rendering"
```

### Task 5: DisplaySettingsPanel 범위 조정 + 위치 초기화 UI

**Files:**
- Modify: `src/components/DisplaySettingsPanel.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/AppLayout.test.tsx`

**Step 1: Write the failing test**

```ts
it("shows 50~130 scale range and reset position control", async () => {
  render(<App />);
  const slider = await screen.findByLabelText("콘텐츠 크기");
  expect(slider).toHaveAttribute("min", "50");
  expect(screen.getByRole("button", { name: "위치 초기화" })).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/AppLayout.test.tsx`  
Expected: FAIL (min 80, 버튼 없음)

**Step 3: Write minimal implementation**

```tsx
<input type="range" min={50} max={130} ... />
<button type="button" onClick={onResetPosition}>위치 초기화</button>
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/AppLayout.test.tsx`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/DisplaySettingsPanel.tsx src/App.tsx src/components/AppLayout.test.tsx
git commit -m "feat: update scale range and add position reset control"
```

### Task 6: 미리보기 드래그 오버레이 구현

**Files:**
- Modify: `src/components/WallpaperPreviewPanel.tsx`
- Modify: `src/styles.css`
- Modify: `src/App.tsx`
- Test: `src/components/ResponsiveLayout.test.tsx`

**Step 1: Write the failing test**

```ts
it("updates display offsets when preview content box is dragged", async () => {
  render(<App />);
  const dragTarget = await screen.findByLabelText("미리보기 콘텐츠 위치 조정 영역");

  fireEvent.pointerDown(dragTarget, { clientX: 120, clientY: 120 });
  fireEvent.pointerMove(window, { clientX: 160, clientY: 150 });
  fireEvent.pointerUp(window);

  expect(screen.getByText(/위치 X/)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/ResponsiveLayout.test.tsx`  
Expected: FAIL (드래그 인터랙션 없음)

**Step 3: Write minimal implementation**

```tsx
// WallpaperPreviewPanel props
onDragPosition: (deltaXRatio: number, deltaYRatio: number) => void;

// pointer events
onPointerDown -> start
window pointermove -> calculate ratio delta -> callback
window pointerup -> stop
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/ResponsiveLayout.test.tsx`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/WallpaperPreviewPanel.tsx src/styles.css src/App.tsx src/components/ResponsiveLayout.test.tsx
git commit -m "feat: add draggable preview overlay for content position"
```

### Task 7: 최종 회귀 검증 및 통합 커밋

**Files:**
- Modify: `src/App.tsx` (invoke payload consistency 및 상태 문구 보정)
- Test: 전체 관련 테스트

**Step 1: Write/update final assertions**

```ts
// apply payload regression
expect(invokeMock).toHaveBeenCalledWith(
  "apply_wallpaper_image",
  expect.objectContaining({
    monitorMode: expect.any(String),
    monitorId: expect.anything()
  })
);
```

**Step 2: Run focused tests**

Run: `npm run test -- src/components/AppLayout.test.tsx src/components/ResponsiveLayout.test.tsx src/renderWallpaper.test.ts src/wallpaper/layout.test.ts src/utils/validation.test.ts`
Expected: PASS

**Step 3: Run full frontend tests**

Run: `npm run test`
Expected: PASS

**Step 4: Build verification**

Run: `npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/App.tsx src/components src/renderWallpaper.ts src/wallpaper/layout.ts src/utils/validation.ts src/types.ts src/defaults.ts
 git commit -m "feat: support 50 percent scale and draggable preview positioning"
```
