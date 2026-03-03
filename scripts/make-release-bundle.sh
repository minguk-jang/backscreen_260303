#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 0.1.0"
  exit 1
fi

VERSION="$1"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NSIS_DIR="$ROOT_DIR/src-tauri/target/release/bundle/nsis"
GUIDE_FILE="$ROOT_DIR/distribution/INSTALL_GUIDE_KO.txt"
DATE_TAG="$(date +%Y-%m-%d)"
OUTPUT_DIR="$ROOT_DIR/release/v${VERSION}-${DATE_TAG}"
TARGET_EXE_NAME="BackScreen_Setup_v${VERSION}.exe"

if [[ ! -d "$NSIS_DIR" ]]; then
  echo "[ERROR] Build output directory not found: $NSIS_DIR"
  echo "Run this first: npm run tauri build"
  exit 1
fi

LATEST_EXE="$(find "$NSIS_DIR" -maxdepth 1 -type f -name '*.exe' -print0 | xargs -0 ls -t 2>/dev/null | head -n 1 || true)"

if [[ -z "${LATEST_EXE:-}" ]]; then
  echo "[ERROR] No installer .exe found in: $NSIS_DIR"
  echo "Run this first: npm run tauri build"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
cp "$LATEST_EXE" "$OUTPUT_DIR/$TARGET_EXE_NAME"

if [[ -f "$GUIDE_FILE" ]]; then
  cp "$GUIDE_FILE" "$OUTPUT_DIR/설치안내.txt"
fi

(
  cd "$OUTPUT_DIR"
  shasum -a 256 "$TARGET_EXE_NAME" > "${TARGET_EXE_NAME}.sha256"
)

cat > "$OUTPUT_DIR/RELEASE_NOTES.txt" <<EOF
BackScreen v${VERSION} 배포 파일
생성일: ${DATE_TAG}

포함 파일:
- ${TARGET_EXE_NAME}
- ${TARGET_EXE_NAME}.sha256
- 설치안내.txt

운영 체크:
1) 설치 파일 업로드 (GitHub Releases or Google Drive)
2) 기존 다운로드 링크를 최신 파일 링크로 갱신
3) 설치안내.txt 그대로 전달
EOF

echo "[DONE] Release bundle created:"
echo "  $OUTPUT_DIR"
