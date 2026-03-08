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
