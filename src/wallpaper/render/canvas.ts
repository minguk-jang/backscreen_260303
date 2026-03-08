import { fitText } from "../textFit";

export interface DrawFitOptions {
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  maxFont: number;
  minFont: number;
  family: string;
  weight?: number;
  color: string;
  align?: CanvasTextAlign;
}

export function setCanvasFont(
  ctx: CanvasRenderingContext2D,
  fontSize: number,
  family: string,
  fontWeight: number
): void {
  ctx.font = `${fontWeight} ${Math.max(1, Math.round(fontSize))}px ${family}`;
}

export function drawFittedText(
  ctx: CanvasRenderingContext2D,
  opts: DrawFitOptions
): { text: string; fontSize: number } {
  if (opts.maxWidth <= 0) {
    return { text: "", fontSize: opts.minFont };
  }

  const measure = (value: string, size: number): number => {
    setCanvasFont(ctx, size, opts.family, opts.weight ?? 400);
    return ctx.measureText(value).width;
  };

  const fitted = fitText(opts.text, {
    maxWidth: opts.maxWidth,
    maxFont: opts.maxFont,
    minFont: opts.minFont,
    measure
  });

  setCanvasFont(ctx, fitted.fontSize, opts.family, opts.weight ?? 400);
  ctx.fillStyle = opts.color;
  ctx.textAlign = opts.align ?? "left";
  ctx.fillText(fitted.text, opts.x, opts.y);

  return fitted;
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: boolean,
  stroke: boolean
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();

  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}
