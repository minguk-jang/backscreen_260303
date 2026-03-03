# BackScreen 배포 운영 가이드 (관리자용)

## 목표
- 비개발자가 항상 최신 설치 파일을 한 번에 받도록 운영합니다.
- 파일명/링크/안내문을 표준화해 혼선을 줄입니다.

## 1) 설치 파일 생성

### 방법 A: GitHub Actions 권장 (Mac 사용자 포함)

1. GitHub 저장소 -> `Actions` 탭 -> `Build Windows Installer` 선택
2. `Run workflow` 클릭
3. 필요 시 version 입력 (예: `0.1.1`), 비우면 `package.json` 버전 사용
4. 완료 후 Artifacts에서 아래 중 하나 다운로드
   - `BackScreen-Release-Package-v<version>`: 전달용 zip 1개
   - `BackScreen-Release-Files-v<version>`: exe/sha256/안내문 개별 파일

### 방법 B: 로컬(Windows) 빌드

```bash
npm run tauri build
./scripts/make-release-bundle.sh 0.1.0
```

생성 위치:
- `release/v0.1.0-YYYY-MM-DD/`

포함 파일:
- `BackScreen_Setup_v0.1.0.exe`
- `BackScreen_Setup_v0.1.0.exe.sha256`
- `설치안내.txt`
- `RELEASE_NOTES.txt`

## 2) 전달 채널 고정 (중요)

아래 중 하나만 사용합니다.

1. GitHub Releases
2. Google Drive 공유 링크

둘 다 운영하지 말고 반드시 하나로 통일합니다.

## 3) 버전 관리 규칙

- 파일명 형식: `BackScreen_Setup_vMAJOR.MINOR.PATCH.exe`
- 변경 기준:
  - PATCH: 오타/사소한 버그 수정
  - MINOR: UI/기능 개선
  - MAJOR: 큰 구조 변경

## 4) 사용자 공지 템플릿

```text
[BackScreen 업데이트 안내]

1) 아래 링크에서 최신 설치 파일을 다운로드하세요.
2) 설치 후 앱 실행 -> 저장 + 배경 적용 클릭
3) 기존 데이터는 자동 유지됩니다.

다운로드: <최신 링크>
```

## 5) 운영 체크리스트

- [ ] (권장) GitHub Actions `Build Windows Installer` 성공
- [ ] Artifacts에서 전달용 zip 또는 파일 다운로드
- [ ] 산출물에 exe + sha256 포함 확인 (Actions artifact 또는 `release/` 폴더)
- [ ] 설치안내.txt 포함 확인
- [ ] 기존 다운로드 링크를 최신 파일로 갱신
- [ ] 공지 템플릿으로 사용자 안내 발송
