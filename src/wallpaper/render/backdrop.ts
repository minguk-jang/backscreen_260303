import { lightenHex } from "./color";

export function fillBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: string
): void {
  const topGradient = ctx.createLinearGradient(0, 0, 0, height);
  topGradient.addColorStop(0, background);
  topGradient.addColorStop(1, lightenHex(background, 0.07));
  ctx.fillStyle = topGradient;
  ctx.fillRect(0, 0, width, height);

  const bubbleA = ctx.createRadialGradient(width * 0.08, height * 0.12, 0, width * 0.08, height * 0.12, width * 0.24);
  bubbleA.addColorStop(0, "rgba(255, 234, 202, 0.72)");
  bubbleA.addColorStop(1, "rgba(255, 234, 202, 0)");
  ctx.fillStyle = bubbleA;
  ctx.fillRect(0, 0, width, height);

  const bubbleB = ctx.createRadialGradient(width * 0.88, height * 0.09, 0, width * 0.88, height * 0.09, width * 0.26);
  bubbleB.addColorStop(0, "rgba(255, 214, 228, 0.66)");
  bubbleB.addColorStop(1, "rgba(255, 214, 228, 0)");
  ctx.fillStyle = bubbleB;
  ctx.fillRect(0, 0, width, height);

  const bubbleC = ctx.createRadialGradient(width * 0.5, height * 0.95, 0, width * 0.5, height * 0.95, width * 0.35);
  bubbleC.addColorStop(0, "rgba(226, 242, 234, 0.42)");
  bubbleC.addColorStop(1, "rgba(226, 242, 234, 0)");
  ctx.fillStyle = bubbleC;
  ctx.fillRect(0, 0, width, height);
}
