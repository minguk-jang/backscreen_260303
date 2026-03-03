# BackScreen 트레이 기본 동작 + 완전 삭제 언인스톨 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 비개발자가 앱 내부에서 `앱 제거`를 실행하면 데이터 완전 삭제와 배경 원복을 포함한 Windows 언인스톨이 안전하게 완료되도록 구현한다.

**Architecture:** 프론트엔드에 확인 입력 기반 제거 UI를 추가하고, Tauri Rust command가 검증/배경 원복/언인스톨러 실행을 담당한다. 설치 스크립트(NSIS) `POSTUNINSTALL` 훅으로 앱 데이터 폴더 삭제를 이중 보장한다. 앱 시작 동작은 트레이 상주 중심으로 바꿔 설정창은 필요 시에만 열도록 한다.

**Tech Stack:** React + TypeScript + Vitest + Testing Library, Tauri v2 (Rust), NSIS hooks

---

### Task 1: 제거 UI 컴포넌트 TDD 구축

**Files:**
- Create: `src/components/UninstallPanel.tsx`
- Create: `src/components/UninstallPanel.test.tsx`
- Modify: `src/styles.css`

**Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UninstallPanel } from "./UninstallPanel";

describe("UninstallPanel", () => {
  it("keeps uninstall button disabled until exact confirm text is entered", () => {
    const onUninstall = vi.fn().mockResolvedValue(undefined);
    render(<UninstallPanel onUninstall={onUninstall} />);

    const button = screen.getByRole("button", { name: "앱 제거 실행" });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText("확인 입력"), { target: { value: "삭제 " } });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText("확인 입력"), { target: { value: "삭제" } });
    expect(button).toBeEnabled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/UninstallPanel.test.tsx`  
Expected: FAIL with module/component not found.

**Step 3: Write minimal implementation**

```tsx
interface UninstallPanelProps {
  onUninstall: (confirmText: string) => Promise<void>;
}

export function UninstallPanel({ onUninstall }: UninstallPanelProps) {
  // confirm text == "삭제" 인 경우에만 버튼 활성
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/UninstallPanel.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/UninstallPanel.tsx src/components/UninstallPanel.test.tsx src/styles.css
git commit -m "feat: add uninstall confirmation panel"
```

### Task 2: App 통합 및 invoke 연동 TDD

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ThemePanel.tsx` (필요 시 제거 패널 배치 위치 확보)
- Modify: `src/components/AppLayout.test.tsx` (또는 적합한 기존 UI 테스트 파일)
- Create (if needed): `src/App.uninstall.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn()
}));

it("calls uninstall_app when confirm text is exact", async () => {
  (invoke as any).mockResolvedValue(undefined);
  render(<App />);
  fireEvent.change(screen.getByLabelText("확인 입력"), { target: { value: "삭제" } });
  fireEvent.click(screen.getByRole("button", { name: "앱 제거 실행" }));
  await waitFor(() => {
    expect(invoke).toHaveBeenCalledWith("uninstall_app", { confirmText: "삭제" });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/App.uninstall.test.tsx`  
Expected: FAIL with missing UI or missing invoke call.

**Step 3: Write minimal implementation**

```ts
const onUninstall = async (confirmText: string): Promise<void> => {
  await invoke("uninstall_app", { confirmText });
  setStatus("앱 제거를 시작합니다.");
};
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/App.uninstall.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/App.tsx src/components/ThemePanel.tsx src/components/AppLayout.test.tsx src/App.uninstall.test.tsx
git commit -m "feat: wire uninstall panel into app command flow"
```

### Task 3: Rust 검증/상태 저장 헬퍼 모듈 TDD

**Files:**
- Create: `src-tauri/src/uninstall_state.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/src/uninstall_state.rs` (module tests)

**Step 1: Write the failing test**

```rust
#[test]
fn validate_confirm_text_requires_exact_korean_word() {
    assert!(validate_confirm_text("삭제").is_ok());
    assert!(validate_confirm_text("삭제 ").is_err());
    assert!(validate_confirm_text("delete").is_err());
}

#[test]
fn system_state_roundtrip_json() {
    let state = SystemState {
        original_wallpaper_path: Some("C:\\wall\\a.jpg".into()),
        captured_at: "2026-03-03T12:00:00+09:00".into(),
    };
    let json = serde_json::to_string(&state).unwrap();
    let decoded: SystemState = serde_json::from_str(&json).unwrap();
    assert_eq!(decoded.original_wallpaper_path.unwrap(), "C:\\wall\\a.jpg");
}
```

**Step 2: Run test to verify it fails**

Run: `cd src-tauri && cargo test uninstall_state -- --nocapture`  
Expected: FAIL with unresolved module/function.

**Step 3: Write minimal implementation**

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SystemState {
    pub original_wallpaper_path: Option<String>,
    pub captured_at: String,
}

pub fn validate_confirm_text(confirm_text: &str) -> Result<(), String> {
    if confirm_text == "삭제" { Ok(()) } else { Err("확인 문구가 일치하지 않습니다.".into()) }
}
```

**Step 4: Run test to verify it passes**

Run: `cd src-tauri && cargo test uninstall_state -- --nocapture`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src-tauri/src/uninstall_state.rs src-tauri/src/lib.rs
git commit -m "feat: add uninstall confirmation and system state helpers"
```

### Task 4: Rust 언인스톨 command + 배경 원복 TDD

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml` (Windows registry 접근이 필요하면 `winreg` 추가)
- Test: `src-tauri/src/lib.rs` (pure helper tests)

**Step 1: Write the failing test**

```rust
#[test]
fn pick_uninstall_command_prefers_uninstall_string() {
    let rows = vec![
        RegistryEntry { display_name: "BackScreen".into(), uninstall_string: Some("C:\\A\\uninstall.exe".into()), quiet_uninstall_string: None }
    ];
    let cmd = choose_uninstall_command(&rows).unwrap();
    assert!(cmd.contains("uninstall.exe"));
}
```

**Step 2: Run test to verify it fails**

Run: `cd src-tauri && cargo test choose_uninstall_command -- --nocapture`  
Expected: FAIL with missing helper.

**Step 3: Write minimal implementation**

```rust
#[tauri::command]
fn uninstall_app(app: AppHandle, confirm_text: String) -> Result<(), String> {
    validate_confirm_text(&confirm_text)?;
    restore_original_wallpaper_if_available(&app)?;
    launch_uninstaller(&app)?;
    app.exit(0);
    Ok(())
}
```

**Step 4: Run test to verify it passes**

Run: `cd src-tauri && cargo test -- --nocapture`  
Expected: helper tests PASS (OS 의존 동작은 mock/pure helper 범위만 검증).

**Step 5: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "feat: add uninstall command with wallpaper restore flow"
```

### Task 5: 시작 시 트레이 상주 기본 동작 적용

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tauri.conf.json` (필요 시 기본 window visibility 설정)

**Step 1: Write the failing test**

```rust
// pure helper test only
#[test]
fn close_behavior_is_hide_not_exit() {
    assert!(close_should_hide());
}
```

**Step 2: Run test to verify it fails**

Run: `cd src-tauri && cargo test close_behavior_is_hide_not_exit -- --nocapture`  
Expected: FAIL.

**Step 3: Write minimal implementation**

```rust
// setup 완료 후 main window를 hide
if let Some(window) = app.get_webview_window("main") {
    let _ = window.hide();
}
```

**Step 4: Run test to verify it passes**

Run: `cd src-tauri && cargo test -- --nocapture`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/tauri.conf.json
git commit -m "feat: default app startup to tray-hidden mode"
```

### Task 6: NSIS POSTUNINSTALL 훅으로 데이터 완전 삭제

**Files:**
- Create: `src-tauri/nsis-hooks.nsh`
- Modify: `src-tauri/tauri.conf.json`
- Test: `.github/workflows/build-windows-installer.yml` (build smoke check only)

**Step 1: Write the failing check**

```bash
rg -n "installerHooks" src-tauri/tauri.conf.json
```

Expected: no result before change.

**Step 2: Implement minimal hook**

```nsh
!macro NSIS_HOOK_POSTUNINSTALL
  RMDir /r "$APPDATA\\com.backscreen.app\\backscreen"
!macroend
```

**Step 3: Run validation**

Run: `node -e "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8')); console.log('ok')"`  
Expected: `ok`.

**Step 4: Run Windows installer workflow syntax check**

Run: `python3 - <<'PY'\nimport yaml,sys\nyaml.safe_load(open('.github/workflows/build-windows-installer.yml'))\nprint('YAML OK')\nPY`  
Expected: `YAML OK`.

**Step 5: Commit**

```bash
git add src-tauri/nsis-hooks.nsh src-tauri/tauri.conf.json
git commit -m "feat: purge app data with nsis post-uninstall hook"
```

### Task 7: 비개발자 문서 업데이트

**Files:**
- Modify: `distribution/INSTALL_GUIDE_KO.txt`
- Modify: `distribution/RELEASE_WORKFLOW_KO.md`
- Modify: `README.md`

**Step 1: Write failing doc check**

Run: `rg -n "앱 제거|완전 삭제|배경 원복" distribution/INSTALL_GUIDE_KO.txt distribution/RELEASE_WORKFLOW_KO.md README.md`  
Expected: missing phrases before change.

**Step 2: Implement doc updates**

```text
- 앱 내 [앱 제거]에서 확인 입력 "삭제" 후 제거 실행
- 제거 시 사용자 데이터 완전 삭제
- 제거 전 기존 바탕화면 원복 시도
```

**Step 3: Run validation**

Run: `rg -n "앱 제거|완전 삭제|배경 원복" distribution/INSTALL_GUIDE_KO.txt distribution/RELEASE_WORKFLOW_KO.md README.md`  
Expected: all files matched.

**Step 4: Commit**

```bash
git add distribution/INSTALL_GUIDE_KO.txt distribution/RELEASE_WORKFLOW_KO.md README.md
git commit -m "docs: add uninstall and data purge guide for non-developers"
```

### Task 8: 최종 검증 (@verification-before-completion)

**Files:**
- Modify (if needed): `docs/plans/2026-03-03-nondeveloper-dashboard-qa-checklist.md`

**Step 1: Run full frontend tests**

Run: `npm run test`  
Expected: all tests PASS.

**Step 2: Run Rust tests**

Run: `cd src-tauri && cargo test -- --nocapture`  
Expected: all tests PASS.

**Step 3: Local build smoke test**

Run: `npm run build`  
Expected: build success.

**Step 4: GitHub Actions smoke run**

Run: push `main` then push tag `vX.Y.Z` and confirm `Build Windows Installer` success with artifact containing:
- `BackScreen_Setup_vX.Y.Z.exe`
- `.sha256`
- `INSTALL_GUIDE_KO.txt`

**Step 5: Final commit/push**

```bash
git add -A
git commit -m "feat: implement tray-first uninstall flow with full data purge"
git push origin main
git push origin vX.Y.Z
```

## Notes for Executor
- Use `@test-driven-development` for each code task (test first, minimal implementation, refactor only if needed).
- Use `@systematic-debugging` immediately if uninstall command or NSIS hook behavior differs from expectation.
- Keep each commit small and reversible.
