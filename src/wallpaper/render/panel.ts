import type { AppState } from "../../types";
import type { Rect } from "../layout";
import { drawFittedText, roundRect } from "./canvas";
import { FONT_HEADING } from "./constants";

export function drawPanelShell(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  title: string,
  theme: AppState["theme"]
): Rect {
  ctx.fillStyle = `${theme.panel}f3`;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 18, true, false);

  drawFittedText(ctx, {
    text: title,
    x: rect.x + rect.w / 2,
    y: rect.y + 44,
    maxWidth: rect.w - 30,
    maxFont: Math.min(38, Math.max(22, rect.w * 0.08)),
    minFont: 16,
    family: FONT_HEADING,
    weight: 700,
    color: theme.accent,
    align: "center"
  });

  ctx.strokeStyle = `${theme.accent}52`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rect.x + 16, rect.y + 62);
  ctx.lineTo(rect.x + rect.w - 16, rect.y + 62);
  ctx.stroke();

  return {
    x: rect.x + 14,
    y: rect.y + 70,
    w: rect.w - 28,
    h: rect.h - 82
  };
}
