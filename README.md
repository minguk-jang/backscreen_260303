# backscreen_260303

윈도우 바탕화면에 날짜/시간, 현재 수업, 시간표, 급식, 일정을 자동으로 렌더링해 적용하는 데스크톱 앱입니다.

## 핵심 기능

- 비개발자용 가이드 대시보드 (초기 설정 체크리스트 + 진행률)
- 월간 빠른 수정 패널 (일정/급식 즉시 추가)
- 시간표 기본 접힘 UX (학기 초 1회 수정 중심)
- 현재 수업 자동 판정 (교시 시간 기준)
- 1분 주기 자동 바탕화면 갱신
- 로컬 SQLite 저장 + 저장 시 JSON 백업 7개 유지
- JSON 가져오기/내보내기
- 트레이 상주 + 창 닫기 시 숨김
- 설치형 배포(NSIS) 설정 포함

## 기술 스택

- Frontend: React + TypeScript + Vite
- Desktop: Tauri v2
- Backend: Rust + rusqlite + image

## 개발 실행

```bash
npm install
npm run tauri dev
```

## 테스트 실행

```bash
npm run test
```

## 사용 흐름 (비개발자 기준)

1. 상단 체크리스트를 보며 학교 정보, 이번 달 급식, 이번 달 일정을 순서대로 입력합니다.
2. 왼쪽 `이번 달 빠른 수정`에서 일정/급식을 먼저 등록합니다.
3. 오른쪽 패널에서 학교 정보와 테마를 설정합니다.
4. 시간표는 기본 접힘 상태이며 필요할 때만 펼쳐 수정합니다.
5. `저장 + 배경 적용`으로 즉시 반영합니다.

## 프로덕션 빌드

```bash
npm run tauri build
```

빌드 시 `src-tauri/tauri.conf.json`의 NSIS 설정을 사용해 Windows 설치형 산출물이 생성됩니다.

## 데이터 저장 위치

Tauri 앱 데이터 디렉터리 하위 `backscreen` 폴더를 사용합니다.

- `app.db`: 앱 상태 저장 SQLite
- `backups/`: 저장 시 생성되는 JSON 스냅샷 (최대 7개)
- `wallpaper/current_wallpaper.bmp`: 마지막 적용된 배경 이미지

## 1차 범위

- 단일 PC 로컬 사용
- 날씨 기능 제외
- Windows 실제 배경 적용
