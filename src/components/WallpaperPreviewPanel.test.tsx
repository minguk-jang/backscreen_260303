import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WallpaperPreviewPanel } from "./WallpaperPreviewPanel";

describe("WallpaperPreviewPanel", () => {
  it("updates position offsets while dragging preview content area", () => {
    const onChangePosition = vi.fn();

    render(
      <WallpaperPreviewPanel
        imageDataUrl="data:image/png;base64,AAAA"
        currentClassLabel="영어 수업 중"
        monthMealsCount={2}
        monthEventsCount={3}
        displaySettings={{
          monitorMode: "primary",
          contentScalePercent: 100,
          offsetXPercent: 0,
          offsetYPercent: 0
        }}
        onChangePosition={onChangePosition}
      />
    );

    const dragArea = screen.getByLabelText("미리보기 콘텐츠 위치 조정 영역");
    const canvas = dragArea.parentElement as HTMLDivElement;
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 683,
      height: 384,
      top: 0,
      left: 0,
      right: 683,
      bottom: 384,
      toJSON: () => ({})
    } as DOMRect);

    fireEvent.pointerDown(dragArea, { clientX: 120, clientY: 120 });
    fireEvent.pointerMove(window, { clientX: 180, clientY: 150 });
    fireEvent.pointerUp(window);

    expect(onChangePosition).toHaveBeenCalled();
    const [nextX, nextY] = onChangePosition.mock.lastCall ?? [0, 0];
    expect(nextX).not.toBe(0);
    expect(nextY).not.toBe(0);
  });
});
