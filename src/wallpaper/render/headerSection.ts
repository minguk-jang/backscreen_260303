import dayjs from "dayjs";
import type { AppState } from "../../types";
import type { Rect } from "../layout";
import { drawFittedText, roundRect } from "./canvas";
import { darkenHex } from "./color";
import { FONT_BODY, FONT_HEADING } from "./constants";

export function drawHeaderSection(
  ctx: CanvasRenderingContext2D,
  header: Rect,
  state: AppState,
  now: dayjs.Dayjs,
  currentLabel: string
): void {
  ctx.fillStyle = `${state.theme.panel}ec`;
  roundRect(ctx, header.x, header.y, header.w, header.h, 24, true, false);

  const paddedX = header.x + 22;
  const paddedW = header.w - 44;

  drawFittedText(ctx, {
    text: now.format("M월 D일 (ddd) HH:mm"),
    x: header.x + header.w / 2,
    y: header.y + Math.max(62, header.h * 0.28),
    maxWidth: paddedW,
    maxFont: Math.min(78, Math.max(34, header.w * 0.043)),
    minFont: 22,
    family: FONT_HEADING,
    weight: 700,
    color: state.theme.accent,
    align: "center"
  });

  const schoolLine = `${state.schoolInfo.schoolName} ${state.schoolInfo.className}`.trim() || "학교/학급 정보 미입력";

  drawFittedText(ctx, {
    text: schoolLine,
    x: header.x + header.w / 2,
    y: header.y + Math.max(106, header.h * 0.47),
    maxWidth: paddedW,
    maxFont: Math.min(30, Math.max(18, header.w * 0.02)),
    minFont: 14,
    family: FONT_BODY,
    weight: 500,
    color: darkenHex(state.theme.primaryText, 0.18),
    align: "center"
  });

  const currentCardH = Math.max(52, Math.min(110, header.h * 0.34));
  const currentCardY = header.y + header.h - currentCardH - 16;

  ctx.fillStyle = state.theme.panelAlt;
  roundRect(ctx, paddedX, currentCardY, paddedW, currentCardH, 18, true, false);

  drawFittedText(ctx, {
    text: currentLabel,
    x: header.x + header.w / 2,
    y: currentCardY + currentCardH / 2 + Math.max(7, currentCardH * 0.08),
    maxWidth: paddedW - 24,
    maxFont: Math.min(36, Math.max(18, header.w * 0.023)),
    minFont: 13,
    family: FONT_HEADING,
    weight: 700,
    color: state.theme.accent,
    align: "center"
  });
}
