interface WallpaperPreviewPanelProps {
  imageDataUrl: string;
  currentClassLabel: string;
  monthMealsCount: number;
  monthEventsCount: number;
}

export function WallpaperPreviewPanel({
  imageDataUrl,
  currentClassLabel,
  monthMealsCount,
  monthEventsCount
}: WallpaperPreviewPanelProps) {
  return (
    <section className="panel preview-panel" aria-label="바탕화면 미리보기">
      <div className="panel-title-row">
        <h2>실시간 미리보기</h2>
        <span>기준 1366x768</span>
      </div>

      <div className="preview-frame" role="img" aria-label="바탕화면 렌더 미리보기">
        {imageDataUrl ? <img className="preview-screen" src={imageDataUrl} alt="바탕화면 미리보기" /> : <p>미리보기를 생성하는 중입니다.</p>}
      </div>

      <div className="preview-meta">
        <div className="preview-stat">
          <strong>현재 상태</strong>
          <p>{currentClassLabel}</p>
        </div>
        <div className="preview-stat">
          <strong>이번 달 입력</strong>
          <p>{`급식 ${monthMealsCount}건 · 일정 ${monthEventsCount}건`}</p>
        </div>
      </div>
    </section>
  );
}
