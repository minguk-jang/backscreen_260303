# BackScreen 콘텐츠 스케일 하한 확장 + 미리보기 드래그 위치 저장 디자인

- 작성일: 2026-03-04
- 범위: 디스플레이 설정 UI, AppState, 레이아웃 계산기, 실시간 미리보기 인터랙션, 바탕화면 적용 동기화

## 승인된 결정

1. 콘텐츠 크기 최소값을 80%에서 50%로 확장한다.
2. 실시간 미리보기에서 콘텐츠 영역을 마우스로 드래그해 위치를 조정한다.
3. 드래그한 위치는 저장되며 실제 바탕화면 적용 결과에도 반영한다.
4. 드래그 시작 지점은 콘텐츠 영역 내부 어디든 가능해야 한다.

## 목표

1. 비개발자도 작은 화면/복잡한 바탕화면 아이콘 배치에 맞게 콘텐츠 위치를 직관적으로 조정할 수 있어야 한다.
2. 미리보기에서 본 위치와 실제 적용 결과가 일치해야 한다.
3. 해상도가 달라도 배치 의도가 최대한 유지되어야 한다.
4. 기존 overflow-safe(테두리 이탈 방지) 정책은 유지되어야 한다.

## 접근 옵션 비교

### 옵션 A: 퍼센트 오프셋 저장 (권장)

- 저장값: `offsetXPercent`, `offsetYPercent` (기준은 base content 영역)
- 장점: 해상도/모니터가 달라져도 상대 위치가 유지됨
- 단점: 계산 시 clamp가 조금 복잡함

### 옵션 B: 픽셀 오프셋 저장

- 저장값: `offsetXpx`, `offsetYpx`
- 장점: 구현 단순
- 단점: 해상도 변경 시 위치 재현성이 낮음

### 옵션 C: 앵커 + 오프셋

- 저장값: `anchor(left/center/right, top/center/bottom)` + 미세 오프셋
- 장점: 제어 모델이 명확
- 단점: "어디든 드래그" 요구와 충돌하고 자유도가 낮음

### 최종 선택

- 옵션 A(퍼센트 오프셋)를 채택한다.

## 데이터 모델 변경

```ts
interface DisplaySettings {
  monitorMode: "all" | "primary" | "single";
  monitorId?: string;
  contentScalePercent: number; // 50~130
  offsetXPercent: number; // -100 ~ 100 (실제 계산 시 clamp)
  offsetYPercent: number; // -100 ~ 100 (실제 계산 시 clamp)
}
```

- 기본값:
  - `contentScalePercent: 100`
  - `offsetXPercent: 0`
  - `offsetYPercent: 0`

## UX 설계

### 디스플레이 설정 패널

1. `콘텐츠 크기` 슬라이더 범위를 `50~130`으로 조정한다.
2. `위치 초기화` 버튼을 추가해 오프셋을 `(0,0)`으로 되돌린다.
3. 현재 위치 보조 표시를 제공한다.

### 실시간 미리보기 패널

1. 미리보기 이미지 위에 드래그 핸들 레이어(콘텐츠 경계 박스)를 오버레이한다.
2. 콘텐츠 경계 내부 어디서 눌러도 드래그 시작 가능하다.
3. 드래그 중 `offsetXPercent`, `offsetYPercent`를 실시간 갱신한다.
4. 드래그 종료 시 상태를 유지한다(저장 버튼 전에도 상태값은 앱 state에 남음).

## 렌더/적용 흐름

1. `computeLayout(width, height, contentScale, offsetXPercent, offsetYPercent)`로 확장한다.
2. base content 중심 위치에서 오프셋을 적용한다.
3. viewport 밖으로 나가지 않도록 최종 좌표를 clamp한다.
4. 미리보기와 실제 `renderWallpaperImage`가 동일 layout 계산 함수를 사용하도록 유지한다.

## 호환성 및 예외 처리

1. 기존 JSON/DB에 오프셋 필드가 없으면 `0,0`으로 자동 보정한다.
2. 스케일이 50 미만/130 초과면 검증 실패 처리한다.
3. 극단 드래그 입력은 허용하되 최종 렌더에서 안전 영역 내로 clamp한다.

## 테스트 전략

1. validation 테스트: `contentScalePercent` 하한 50 허용, 49 거부
2. layout 테스트: 오프셋 적용/클램프 검증
3. App 테스트: 드래그 동작 후 state 오프셋 반영 검증
4. render 테스트: 작은 스케일(50) + 큰 오프셋에서도 렌더 크래시/테두리 이탈 없음

## 범위 밖

1. 키보드 방향키로 미세 이동
2. 모니터별 개별 오프셋 프로필
3. 드래그 스냅(격자/가이드라인)
