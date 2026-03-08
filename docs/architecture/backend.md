# Backend Architecture

## 목표

Rust 백엔드는 Tauri command, persistence, OS 연동, UI bootstrap을 분리해서 프론트 계약을 유지하면서도 수정 범위를 국소화하는 것을 목표로 한다.

## 모듈 구조

- `src-tauri/src/lib.rs`
  - 모듈 선언과 `run()` re-export만 담당한다.
- `src-tauri/src/app.rs`
  - Tauri builder, autostart, window close 동작, invoke handler 연결
- `src-tauri/src/commands.rs`
  - 프론트가 호출하는 command 함수
- `src-tauri/src/models.rs`
  - 앱 상태 직렬화 모델과 기본 상태 생성
- `src-tauri/src/persistence.rs`
  - SQLite 읽기/쓰기, app data 경로, 백업, 시스템 상태 저장
- `src-tauri/src/monitor.rs`
  - 모니터 목록 조회와 대상 해석
- `src-tauri/src/wallpaper.rs`
  - PNG 디코드, BMP 저장, OS별 배경 적용, 원본 배경 복원
- `src-tauri/src/tray.rs`
  - 트레이 메뉴와 Todo 위젯 창 생성
- `src-tauri/src/uninstall.rs`
  - 언인스톨러 실행 경로 계산 및 실행
- `src-tauri/src/display_target.rs`, `src-tauri/src/uninstall_state.rs`
  - 독립적인 보조 모델/로직

## 책임 경계

- command는 orchestration만 담당한다.
- DB와 파일 시스템 접근은 `persistence.rs`로 모은다.
- OS별 배경 처리와 PowerShell script 생성은 `wallpaper.rs`에 둔다.
- 트레이/위젯 창 관련 UI bootstrap은 `tray.rs`에서 처리한다.

## 작업 규칙

- 프론트 payload가 바뀌면 먼저 `models.rs`와 command 시그니처를 같이 검토한다.
- command 이름은 프론트 invoke 계약이므로 쉽게 바꾸지 않는다.
- OS 의존 로직은 `cfg(target_os = "windows")` 블록 안에 유지한다.
- 테스트 가능한 helper는 해당 모듈 안 unit test로 둔다.
