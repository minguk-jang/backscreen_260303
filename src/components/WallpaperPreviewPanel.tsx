import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { getWallpaperLayout } from "../renderWallpaper";
import type { DisplaySettings } from "../types";

interface WallpaperPreviewPanelProps {
  imageDataUrl: string;
  currentClassLabel: string;
  monthMealsCount: number;
  monthEventsCount: number;
  displaySettings: DisplaySettings;
  onChangePosition: (offsetXPercent: number, offsetYPercent: number) => void;
}

export function WallpaperPreviewPanel({
  imageDataUrl,
  currentClassLabel,
  monthMealsCount,
  monthEventsCount,
  displaySettings,
  onChangePosition
}: WallpaperPreviewPanelProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    baseOffsetX: number;
    baseOffsetY: number;
    frameWidth: number;
    frameHeight: number;
    moveHalfW: number;
    moveHalfH: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const previewWidth = 1366;
  const previewHeight = 768;
  const layout = useMemo(
    () => getWallpaperLayout(previewWidth, previewHeight, displaySettings),
    [displaySettings]
  );

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const onMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      const dxScreen = event.clientX - dragState.startX;
      const dyScreen = event.clientY - dragState.startY;
      const dxBase = (dxScreen / dragState.frameWidth) * previewWidth;
      const dyBase = (dyScreen / dragState.frameHeight) * previewHeight;

      const deltaXPercent = (dxBase / dragState.moveHalfW) * 100;
      const deltaYPercent = (dyBase / dragState.moveHalfH) * 100;

      const nextX = Math.max(-100, Math.min(100, dragState.baseOffsetX + deltaXPercent));
      const nextY = Math.max(-100, Math.min(100, dragState.baseOffsetY + deltaYPercent));

      onChangePosition(nextX, nextY);
    };

    const onUp = () => {
      dragStateRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isDragging, onChangePosition]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!frameRef.current) {
      return;
    }

    const rect = frameRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const baseW = previewWidth - layout.safe.left - layout.safe.right;
    const baseH = previewHeight - layout.safe.top - layout.safe.bottom;
    const moveHalfW = Math.max(1, (baseW - layout.content.w) / 2);
    const moveHalfH = Math.max(1, (baseH - layout.content.h) / 2);

    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseOffsetX: displaySettings.offsetXPercent,
      baseOffsetY: displaySettings.offsetYPercent,
      frameWidth: rect.width,
      frameHeight: rect.height,
      moveHalfW,
      moveHalfH
    };
    setIsDragging(true);
    event.preventDefault();
  };

  const contentBoxStyle = {
    left: `${(layout.content.x / previewWidth) * 100}%`,
    top: `${(layout.content.y / previewHeight) * 100}%`,
    width: `${(layout.content.w / previewWidth) * 100}%`,
    height: `${(layout.content.h / previewHeight) * 100}%`
  };

  return (
    <section className="panel preview-panel" aria-label="바탕화면 미리보기">
      <div className="panel-title-row">
        <h2>실시간 미리보기</h2>
        <span>기준 1366x768</span>
      </div>

      <div className="preview-frame" role="img" aria-label="바탕화면 렌더 미리보기">
        {imageDataUrl ? (
          <div className="preview-canvas" ref={frameRef}>
            <img className="preview-screen" src={imageDataUrl} alt="바탕화면 미리보기" />
            <div
              aria-label="미리보기 콘텐츠 위치 조정 영역"
              className={`preview-content-box${isDragging ? " dragging" : ""}`}
              style={contentBoxStyle}
              onPointerDown={onPointerDown}
            />
          </div>
        ) : (
          <p>미리보기를 생성하는 중입니다.</p>
        )}
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
