# Repository Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split oversized source and documentation files into clear feature-oriented modules while preserving current behavior and UI.

**Architecture:** Keep public entry points stable while moving logic into smaller modules. Frontend state orchestration, wallpaper rendering, styles, Rust commands, and documentation are separated by responsibility so future changes are localized.

**Tech Stack:** React, TypeScript, Vite, Vitest, Tauri v2, Rust, rusqlite

---

### Task 1: Protect Current Frontend Boundaries With Tests

**Files:**
- Modify: `src/components/AppLayout.test.tsx`
- Modify: `src/renderWallpaper.test.ts`

**Step 1: Write the failing test**

- Add assertions that cover the stable public boundaries that must survive refactor:
  - `App` still renders the same key control labels and main panels
  - `renderWallpaperImage` and `getWallpaperLayout` remain available from the current import path

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/AppLayout.test.tsx src/renderWallpaper.test.ts`
Expected: FAIL if the new assertions expose missing boundary guarantees.

**Step 3: Write minimal implementation**

- Adjust exports or test fixtures only enough to make the boundary expectations explicit.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/AppLayout.test.tsx src/renderWallpaper.test.ts`
Expected: PASS

### Task 2: Split Frontend App Orchestration

**Files:**
- Create: `src/app/AppShell.tsx`
- Create: `src/app/useStudioApp.ts`
- Create: `src/app/state.ts`
- Create: `src/app/storage.ts`
- Create: `src/app/types.ts`
- Create: `src/components/editors/MealEditor.tsx`
- Create: `src/components/editors/EventEditor.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/AppLayout.test.tsx`

**Step 1: Write the failing test**

- Add at least one test that proves `App` still renders and triggers wallpaper apply/uninstall through the same UI after internal module extraction.

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/AppLayout.test.tsx`
Expected: FAIL for the new assertion before the refactor code exists.

**Step 3: Write minimal implementation**

- Move state merge helpers, local storage sync, Tauri event wiring, and action handlers into `src/app/*`.
- Keep `src/App.tsx` as a thin export or composition entry.
- Move inline meal/event editor components into dedicated files.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/AppLayout.test.tsx`
Expected: PASS

### Task 3: Split Wallpaper Rendering Modules

**Files:**
- Create: `src/wallpaper/render/index.ts`
- Create: `src/wallpaper/render/constants.ts`
- Create: `src/wallpaper/render/color.ts`
- Create: `src/wallpaper/render/canvas.ts`
- Create: `src/wallpaper/render/backdrop.ts`
- Create: `src/wallpaper/render/headerSection.ts`
- Create: `src/wallpaper/render/timetableSection.ts`
- Create: `src/wallpaper/render/mealsSection.ts`
- Create: `src/wallpaper/render/todoSection.ts`
- Create: `src/wallpaper/render/eventsSection.ts`
- Modify: `src/renderWallpaper.ts`
- Test: `src/renderWallpaper.test.ts`

**Step 1: Write the failing test**

- Add a test that imports from `src/renderWallpaper.ts` and validates the public API remains intact after internals move.

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/renderWallpaper.test.ts`
Expected: FAIL for the new assertion before the re-exported structure exists.

**Step 3: Write minimal implementation**

- Move section renderers and shared canvas/color helpers into `src/wallpaper/render/*`.
- Keep `src/renderWallpaper.ts` as a compatibility entry that re-exports the public API.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/renderWallpaper.test.ts`
Expected: PASS

### Task 4: Split Global Styles By Responsibility

**Files:**
- Create: `src/styles/base.css`
- Create: `src/styles/layout.css`
- Create: `src/styles/forms.css`
- Create: `src/styles/panels.css`
- Create: `src/styles/preview.css`
- Create: `src/styles/widget.css`
- Create: `src/styles/responsive.css`
- Modify: `src/main.tsx`
- Delete: `src/styles.css`
- Test: `src/components/AppLayout.test.tsx`

**Step 1: Write the failing test**

- Add or keep a rendering smoke test that would fail if `App` cannot load after style import changes.

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/AppLayout.test.tsx`
Expected: FAIL once the old stylesheet import is removed before the new import chain is complete.

**Step 3: Write minimal implementation**

- Split the stylesheet by concern while preserving selector names and order-sensitive rules.
- Update `src/main.tsx` to import the new CSS files in the old cascade order.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/AppLayout.test.tsx`
Expected: PASS

### Task 5: Split Tauri Rust Modules

**Files:**
- Create: `src-tauri/src/app.rs`
- Create: `src-tauri/src/commands.rs`
- Create: `src-tauri/src/models.rs`
- Create: `src-tauri/src/persistence.rs`
- Create: `src-tauri/src/wallpaper.rs`
- Create: `src-tauri/src/monitor.rs`
- Create: `src-tauri/src/tray.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/display_target.rs`
- Modify: `src-tauri/src/uninstall_state.rs`
- Test: `src-tauri/src/lib.rs`

**Step 1: Write the failing test**

- Add or relocate tests so they validate the stable helpers after module extraction, such as widget URL, uninstall path resolution, and PowerShell script generation.

**Step 2: Run test to verify it fails**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: FAIL until the moved functions are re-exported or imports are corrected.

**Step 3: Write minimal implementation**

- Move data models, persistence, monitor resolution, wallpaper OS hooks, and tray setup into dedicated modules.
- Keep command names and payloads unchanged.
- Reduce `lib.rs` to module wiring and `run()`.

**Step 4: Run test to verify it passes**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS

### Task 6: Refresh Documentation And Split Oversized Docs

**Files:**
- Modify: `README.md`
- Create: `docs/architecture/frontend.md`
- Create: `docs/architecture/backend.md`
- Modify: `docs/plans/2026-03-03-nondeveloper-dashboard-implementation.md`
- Modify: `docs/plans/2026-03-04-overlay-todo-import-monitor-scale-implementation.md`

**Step 1: Write the failing test**

- Use a structural check: identify docs over 500 lines and treat that as the failure condition.

**Step 2: Run test to verify it fails**

Run: `find docs src src-tauri -type f \\( -name '*.md' -o -name '*.ts' -o -name '*.tsx' -o -name '*.rs' -o -name '*.css' \\) -print0 | xargs -0 wc -l | sort -nr | head`
Expected: FAIL condition is any human-managed source/doc file over 500 lines.

**Step 3: Write minimal implementation**

- Update `README.md` for the new structure and contributor workflow.
- Add architecture docs.
- Split oversized plan docs into linked parts or archive indexes while preserving discoverability.

**Step 4: Run test to verify it passes**

Run: `find docs src src-tauri -type f \\( -name '*.md' -o -name '*.ts' -o -name '*.tsx' -o -name '*.rs' -o -name '*.css' \\) -print0 | xargs -0 wc -l | sort -nr | head`
Expected: No human-managed source/doc file over 500 lines

### Task 7: Full Verification

**Files:**
- Verify only

**Step 1: Run frontend tests**

Run: `npm run test`
Expected: PASS

**Step 2: Run frontend build**

Run: `npm run build`
Expected: PASS

**Step 3: Run Rust tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS

**Step 4: Run size audit**

Run: `find docs src src-tauri -type f \\( -name '*.md' -o -name '*.ts' -o -name '*.tsx' -o -name '*.rs' -o -name '*.css' \\) -print0 | xargs -0 wc -l | sort -nr | head -n 30`
Expected: No human-managed source/doc file above 500 lines
