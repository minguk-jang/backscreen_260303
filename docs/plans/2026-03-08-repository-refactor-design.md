# Repository Refactor Design

## Goal

전체 저장소를 동작과 UI 변화 없이 리팩토링해서 각 사람이 관리하는 소스/문서 파일이 500줄을 넘지 않도록 정리한다. 이후 Codex가 기능 단위로 안전하게 탐색, 수정, 테스트할 수 있도록 책임 경계를 명확히 만든다.

## Non-Goals

- 사용자 동작 변경
- UI 레이아웃/문구 변경
- 새 기능 추가
- 생성물(`dist`, `src-tauri/target`, 잠금 파일, 스키마 산출물) 재구성

## Constraints

- 기존 테스트는 유지하거나 보강한다.
- 파일 분리는 기능 경계 기준으로 한다. 단순 임의 분할은 피한다.
- 500줄 제한은 수동 관리 대상 파일에 적용한다.

## Current Problems

- `src/App.tsx`가 상태 초기화, 이벤트 연동, 저장/적용 액션, 인라인 편집 UI까지 모두 포함한다.
- `src/renderWallpaper.ts`가 레이아웃 계산, 캔버스 유틸, 섹션 렌더링, 색상 유틸을 한 파일에 담고 있다.
- `src/styles.css`가 앱, 폼, 패널, 미리보기, 위젯, 반응형 규칙을 한곳에 모아 수정 비용이 높다.
- `src-tauri/src/lib.rs`가 모델, 명령, persistence, 모니터/트레이/언인스톨 로직을 모두 포함한다.
- 문서가 현재 구조를 설명하지 않고, 일부 계획 문서는 500줄을 초과한다.

## Chosen Approach

도메인 기준 재구성으로 진행한다.

- 프론트엔드
  - `src/app/`: 앱 부트스트랩, 상태 병합, Tauri 연동, 액션 훅
  - `src/components/editors/`: 급식/행사 편집기
  - `src/services/`: JSON import/export, wallpaper apply 같은 외부 연동성 로직
  - `src/wallpaper/render/`: 섹션별 캔버스 렌더러
  - `src/styles/`: 목적별 CSS 파일
- Rust
  - `src-tauri/src/models.rs`: 직렬화 모델
  - `src-tauri/src/commands.rs`: Tauri command
  - `src-tauri/src/persistence.rs`: SQLite 및 백업
  - `src-tauri/src/wallpaper.rs`: 배경 적용/복원
  - `src-tauri/src/monitor.rs`: 모니터 선택 및 크기 계산
  - `src-tauri/src/tray.rs`: 트레이 및 위젯 창
  - `src-tauri/src/app.rs`: Builder 조립
  - `src-tauri/src/lib.rs`: 모듈 선언과 `run()` 위임
- 문서
  - `README.md`를 현재 구조와 작업 규칙 기준으로 재작성
  - `docs/architecture/` 아래에 프론트/백엔드 구조 설명 추가
  - 500줄 초과 계획 문서는 part 문서로 나누고 인덱스 문서를 둔다

## File Boundary Rules

- 한 파일은 하나의 주된 책임만 가진다.
- 섹션 렌더러는 공통 유틸을 직접 포함하지 않는다.
- React 컴포넌트는 화면 조립과 상태 액션을 분리한다.
- Rust command는 orchestration만 담당하고, 실제 IO/OS 처리 로직은 하위 모듈로 이동한다.
- 문서는 “현재 상태 설명”과 “과거 작업 기록”을 분리한다.

## Testing Strategy

- 기존 프론트 테스트를 유지하면서 새 구조를 대상으로 import 경로를 갱신한다.
- 리팩토링 보호용 테스트를 먼저 추가한다.
  - 앱 조립이 동일한 주요 UI를 렌더하는지
  - wallpaper renderer public API가 유지되는지
  - Rust helper가 분리 후에도 기존 동작을 유지하는지
- 전체 `npm run test`, `npm run build`, `cargo test`로 검증한다.

## Risks And Mitigations

- 큰 파일 이동으로 import 경로가 깨질 수 있다.
  - 공용 entry file을 유지해 단계적으로 이동한다.
- Tauri command wiring이 깨질 수 있다.
  - command 함수 시그니처는 유지하고 모듈만 분리한다.
- CSS 분리 중 우선순위가 바뀔 수 있다.
  - 기존 선언 순서를 기준으로 import 순서를 유지한다.

## Expected Outcome

- 사람이 관리하는 모든 소스/문서 파일이 500줄 이하가 된다.
- 기능별 탐색 경로가 명확해진다.
- 이후 작업 시 “어디를 수정해야 하는지”가 훨씬 예측 가능해진다.
