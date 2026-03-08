# backscreen_260303

교실 바탕화면에 날짜, 현재 수업, 시간표, 급식, 일정, Todo를 렌더링하고 Windows 배경으로 적용하는 Tauri 데스크톱 앱입니다.

## 핵심 기능

- 현재 수업 자동 판정과 실시간 미리보기
- 급식/행사/Todo 편집 및 JSON 가져오기/내보내기
- 모니터 대상 선택, 콘텐츠 스케일, 미리보기 위치 조정
- 1분 주기 자동 배경 적용
- SQLite 저장과 JSON 백업 7개 유지
- 트레이 상주, 위젯 창, 앱 내 제거 플로우

## 개발 실행

```bash
npm install
npm run tauri dev
```

## 검증 명령

```bash
npm run test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

## 현재 구조

### Frontend

- `src/App.tsx`: 앱 진입점
- `src/app/`: 스튜디오 상태, 동기화, 앱 셸
- `src/components/`: 패널과 편집 UI
- `src/components/editors/`: 급식/행사 카드 편집기
- `src/wallpaper/`: 레이아웃 계산과 렌더러
- `src/styles/`: 목적별 CSS 레이어
- `src/utils/`: 검증, 월간 데이터, Todo 정렬 등 순수 유틸

### Backend

- `src-tauri/src/app.rs`: Tauri builder 조립
- `src-tauri/src/commands.rs`: 프론트에서 호출하는 command
- `src-tauri/src/models.rs`: 직렬화 모델과 기본 상태
- `src-tauri/src/persistence.rs`: SQLite 및 백업
- `src-tauri/src/monitor.rs`: 모니터 선택/크기 계산
- `src-tauri/src/wallpaper.rs`: 배경 적용/복원
- `src-tauri/src/tray.rs`: 트레이와 위젯 창
- `src-tauri/src/uninstall.rs`: 언인스톨 실행 경로

## 문서

- [frontend.md](/Users/mingukjang/git/backscreen_260303/docs/architecture/frontend.md)
- [backend.md](/Users/mingukjang/git/backscreen_260303/docs/architecture/backend.md)
- `docs/plans/`: 설계/구현 기록

500줄 제한은 사람이 관리하는 소스와 문서에 적용합니다. 생성물인 `dist`, `src-tauri/target`, 잠금 파일, 스키마 산출물은 제외합니다.

## 배포 관련

- 설치형 빌드: `npm run tauri build`
- 배포 번들: `npm run release:bundle -- 0.1.0`
- 운영 가이드: [RELEASE_WORKFLOW_KO.md](/Users/mingukjang/git/backscreen_260303/distribution/RELEASE_WORKFLOW_KO.md)
- 설치 안내: [INSTALL_GUIDE_KO.txt](/Users/mingukjang/git/backscreen_260303/distribution/INSTALL_GUIDE_KO.txt)

## 데이터 저장 위치

Tauri 앱 데이터 디렉터리 하위 `backscreen` 폴더를 사용합니다.

- `app.db`: 앱 상태 저장
- `backups/`: 저장 시 생성되는 JSON 스냅샷
- `wallpaper/current_wallpaper.bmp`: 마지막 적용된 배경 이미지
- `system_state.json`: 원본 배경 경로 등 시스템 상태
