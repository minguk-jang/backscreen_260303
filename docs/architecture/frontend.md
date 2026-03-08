# Frontend Architecture

## 목표

프론트엔드는 화면 조립, 상태 오케스트레이션, 렌더링, 순수 유틸을 분리해서 이후 기능 수정 시 탐색 범위를 줄이는 것을 목표로 한다.

## 폴더 구조

- `src/App.tsx`
  - 앱 진입점. `useStudioApp()` 결과를 `AppShell`에 전달한다.
- `src/app/`
  - `AppShell.tsx`: 스튜디오 메인 화면 조립
  - `useStudioApp.ts`: 앱 효과, 동기화, 파생 상태
  - `useStudioActions.ts`: 사용자 액션과 저장/적용 로직
  - `state.ts`: 저장 데이터와 기본값 병합
  - `storage.ts`, `sync.ts`, `types.ts`: 로컬 동기화 보조 모듈
- `src/components/`
  - 패널 단위 UI 컴포넌트
- `src/components/editors/`
  - 리스트 내 카드 편집기
- `src/wallpaper/`
  - `layout.ts`, `textFit.ts`, `sectionCapacity.ts`: 순수 계산
  - `render/`: 캔버스 렌더러 섹션별 구현
- `src/styles/`
  - `base`, `layout`, `forms`, `panels`, `preview`, `widget`, `responsive`

## 책임 경계

- 화면 구성 변경은 `AppShell`과 개별 패널에서 처리한다.
- 저장/적용/JSON 입출력/상태 mutation은 `useStudioActions`에서 처리한다.
- Tauri 이벤트, 로컬 스토리지 동기화, 트레이/위젯 연동은 `useStudioApp` effect 구간에 둔다.
- 배경 렌더링 수정은 `src/wallpaper/render/*`에서만 처리하고, `src/renderWallpaper.ts`는 호환용 엔트리로 유지한다.

## 작업 규칙

- 새 기능은 가능하면 `src/app`과 `src/components` 사이의 경계를 유지한다.
- 순수 계산 로직은 `src/utils` 또는 `src/wallpaper`로 뺀다.
- 기존 공개 import 경로를 바꿔야 할 때는 먼저 호환 re-export를 둔다.
- 스타일 추가는 목적에 맞는 CSS 파일에 넣고, import 순서 변경이 필요한지 확인한다.
