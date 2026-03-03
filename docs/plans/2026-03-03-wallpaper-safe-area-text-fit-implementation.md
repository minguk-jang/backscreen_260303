# BackScreen 바탕화면 안전영역/텍스트 오버플로우 개선 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 바탕화면 렌더링을 안전영역(좌 12%, 상 8%) 기반으로 재구성하고, 모든 텍스트를 자동 축소+말줄임으로 제한해 테두리 밖 이탈을 제거한다.

**Architecture:** `src/renderWallpaper.ts`의 좌표/텍스트 로직을 순수 유틸(`layout`, `textFit`, `sectionCapacity`)로 분리한다. 렌더링 함수는 유틸이 반환한 제약값만 사용해 캔버스에 그림을 그린다. 테스트는 유틸 단위 테스트 + 렌더 회귀 테스트로 구성한다.

**Tech Stack:** React + TypeScript, Canvas API, Vitest.

---

- 적용 원칙: @superpowers:test-driven-development, @superpowers:verification-before-completion

### Task 1: 안전영역 레이아웃 계산 유틸 추가

**Files:**
- Create: `src/wallpaper/layout.ts`
- Create: `src/wallpaper/layout.test.ts`

**Step 1: Write the failing test**

```ts
// src/wallpaper/layout.test.ts
import { describe, expect, it } from "vitest";
import { computeLayout } from "./layout";

describe("computeLayout", () => {
  it("reserves 12% left and 8% top safe area", () => {
    const layout = computeLayout(1920, 1080);
    expect(layout.safe.left).toBeCloseTo(230.4, 1);
    expect(layout.safe.top).toBeCloseTo(86.4, 1);
    expect(layout.content.x).toBeGreaterThanOrEqual(layout.safe.left);
    expect(layout.content.y).toBeGreaterThanOrEqual(layout.safe.top);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/wallpaper/layout.test.ts`  
Expected: FAIL with `Cannot find module './layout'`.

**Step 3: Write minimal implementation**

```ts
// src/wallpaper/layout.ts
export interface Rect { x: number; y: number; w: number; h: number }

export interface WallpaperLayout {
  safe: { left: number; top: number; right: number; bottom: number };
  content: Rect;
  header: Rect;
  columns: [Rect, Rect, Rect];
}

export function computeLayout(width: number, height: number): WallpaperLayout {
  const safe = {
    left: width * 0.12,
    top: height * 0.08,
    right: Math.max(24, width * 0.03),
    bottom: Math.max(24, height * 0.03)
  };

  const content: Rect = {
    x: safe.left,
    y: safe.top,
    w: Math.max(320, width - safe.left - safe.right),
    h: Math.max(260, height - safe.top - safe.bottom)
  };

  const headerH = Math.max(180, Math.min(content.h * 0.3, 320));
  const gap = Math.max(12, content.w * 0.015);
  const colW = (content.w - gap * 2) / 3;
  const bodyY = content.y + headerH + gap;
  const bodyH = content.h - headerH - gap;

  return {
    safe,
    content,
    header: { x: content.x, y: content.y, w: content.w, h: headerH },
    columns: [
      { x: content.x, y: bodyY, w: colW, h: bodyH },
      { x: content.x + colW + gap, y: bodyY, w: colW, h: bodyH },
      { x: content.x + (colW + gap) * 2, y: bodyY, w: colW, h: bodyH }
    ]
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/wallpaper/layout.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/wallpaper/layout.ts src/wallpaper/layout.test.ts
git commit -m "feat: add wallpaper safe-area layout calculator"
```

### Task 2: 텍스트 자동축소/말줄임 유틸 추가

**Files:**
- Create: `src/wallpaper/textFit.ts`
- Create: `src/wallpaper/textFit.test.ts`

**Step 1: Write the failing test**

```ts
// src/wallpaper/textFit.test.ts
import { describe, expect, it } from "vitest";
import { fitText } from "./textFit";

describe("fitText", () => {
  it("shrinks text size first and ellipsizes at min size", () => {
    const measure = (text: string, size: number) => text.length * size * 0.6;
    const result = fitText("아주아주긴문자열테스트", {
      maxWidth: 120,
      maxFont: 28,
      minFont: 14,
      measure
    });

    expect(result.fontSize).toBeGreaterThanOrEqual(14);
    expect(result.text.length).toBeGreaterThan(0);
    expect(measure(result.text, result.fontSize)).toBeLessThanOrEqual(120);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/wallpaper/textFit.test.ts`  
Expected: FAIL with `Cannot find module './textFit'`.

**Step 3: Write minimal implementation**

```ts
// src/wallpaper/textFit.ts
interface FitOptions {
  maxWidth: number;
  maxFont: number;
  minFont: number;
  measure: (text: string, fontSize: number) => number;
}

export function fitText(input: string, opts: FitOptions): { text: string; fontSize: number } {
  if (opts.maxWidth <= 0 || opts.minFont <= 0) {
    return { text: "", fontSize: opts.minFont };
  }

  for (let size = opts.maxFont; size >= opts.minFont; size -= 1) {
    if (opts.measure(input, size) <= opts.maxWidth) {
      return { text: input, fontSize: size };
    }
  }

  let text = input;
  const size = opts.minFont;
  while (text.length > 1 && opts.measure(`${text}…`, size) > opts.maxWidth) {
    text = text.slice(0, -1);
  }
  return { text: `${text}…`, fontSize: size };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/wallpaper/textFit.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/wallpaper/textFit.ts src/wallpaper/textFit.test.ts
git commit -m "feat: add text fit utility with shrink-and-ellipsis policy"
```

### Task 3: 패널별 표시 가능 항목 계산 유틸 추가

**Files:**
- Create: `src/wallpaper/sectionCapacity.ts`
- Create: `src/wallpaper/sectionCapacity.test.ts`

**Step 1: Write the failing test**

```ts
// src/wallpaper/sectionCapacity.test.ts
import { describe, expect, it } from "vitest";
import { limitItems } from "./sectionCapacity";

describe("limitItems", () => {
  it("returns visible items and hidden count", () => {
    const { visible, hidden } = limitItems(["a", "b", "c", "d"], 2);
    expect(visible).toEqual(["a", "b"]);
    expect(hidden).toBe(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/wallpaper/sectionCapacity.test.ts`  
Expected: FAIL with `Cannot find module './sectionCapacity'`.

**Step 3: Write minimal implementation**

```ts
// src/wallpaper/sectionCapacity.ts
export function limitItems<T>(items: T[], maxCount: number): { visible: T[]; hidden: number } {
  const safeCount = Math.max(0, Math.floor(maxCount));
  const visible = items.slice(0, safeCount);
  return { visible, hidden: Math.max(0, items.length - visible.length) };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/wallpaper/sectionCapacity.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/wallpaper/sectionCapacity.ts src/wallpaper/sectionCapacity.test.ts
git commit -m "feat: add section capacity limiter for overflow-safe rendering"
```

### Task 4: `renderWallpaper.ts`를 안전영역 + 텍스트 유틸 기반으로 리팩터링

**Files:**
- Modify: `src/renderWallpaper.ts`
- Modify: `src/renderWallpaper.test.ts`

**Step 1: Write the failing test**

```ts
// src/renderWallpaper.test.ts (추가 케이스)
it("renders safely with long strings on 1366x768", () => {
  const state = {
    ...defaultState,
    schoolInfo: {
      schoolName: "아주아주아주아주긴학교이름테스트초등학교",
      className: "6학년 12반 긴 반이름 테스트"
    },
    events: [
      {
        id: "e1",
        date: "2026-03-03",
        title: "아주 긴 행사 제목 아주 긴 행사 제목 아주 긴 행사 제목",
        details: "아주 긴 상세 설명 아주 긴 상세 설명 아주 긴 상세 설명",
        color: "#f59e0b"
      }
    ]
  };
  const data = renderWallpaperImage(state, 1366, 768);
  expect(data.startsWith("data:image/png;base64,")).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/renderWallpaper.test.ts`  
Expected: FAIL after adding assertions for new layout exports (e.g. `computeLayout` integration checks).

**Step 3: Write minimal implementation**

```ts
// src/renderWallpaper.ts (핵심 적용 요약)
import { computeLayout } from "./wallpaper/layout";
import { fitText } from "./wallpaper/textFit";
import { limitItems } from "./wallpaper/sectionCapacity";

// 1) margin/panelGap/topHeight 직접 계산 제거
// 2) const layout = computeLayout(width, height) 사용
// 3) 텍스트 출력 지점마다 fitText를 통해 size/text 결정
// 4) 일정/급식/시간표 항목은 limitItems로 표시 개수 제한
// 5) hidden > 0 인 경우 "+N개" 라벨을 마지막 줄에 출력
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/renderWallpaper.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderWallpaper.ts src/renderWallpaper.test.ts
git commit -m "refactor: apply safe-area layout and overflow-safe text rendering"
```

### Task 5: 전체 회귀 검증 및 수동 QA 체크리스트 반영

**Files:**
- Create: `docs/plans/2026-03-03-wallpaper-safe-area-text-fit-qa-checklist.md`

**Step 1: Write the checklist file**

```md
# Wallpaper Safe-Area QA Checklist

- [ ] 1366x768: 좌측 12%, 상단 8% 여백 유지
- [ ] 1920x1080: 좌측 아이콘 영역 미침범
- [ ] 2560x1440: 패널 비율 유지
- [ ] 긴 텍스트: 카드 밖 이탈 없음
- [ ] 100% / 125% / 150% 배율: 글자 깨짐 없음
```

**Step 2: Run full test suite**

Run: `npm run test`  
Expected: PASS (existing + new tests all green).

**Step 3: Manual verification on Windows build**

Run:
1. `npm run tauri build`
2. 설치 파일 실행 후 `저장 + 배경 적용`

Expected:
- 앱이 크래시 없이 배경 적용
- 텍스트가 카드 경계 밖으로 보이지 않음

**Step 4: Commit**

```bash
git add docs/plans/2026-03-03-wallpaper-safe-area-text-fit-qa-checklist.md
git commit -m "docs: add wallpaper safe-area qa checklist"
```
