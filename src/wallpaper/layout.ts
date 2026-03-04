export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WallpaperLayout {
  safe: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  content: Rect;
  header: Rect;
  columns: [Rect, Rect, Rect];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeLayout(width: number, height: number, contentScale = 1): WallpaperLayout {
  const safe = {
    left: width * 0.12,
    top: height * 0.08,
    right: Math.max(24, width * 0.03),
    bottom: Math.max(24, height * 0.03)
  };

  const baseContent: Rect = {
    x: safe.left,
    y: safe.top,
    w: Math.max(320, width - safe.left - safe.right),
    h: Math.max(260, height - safe.top - safe.bottom)
  };

  const scale = clamp(contentScale, 0.8, 1.3);
  const minPadX = Math.max(12, width * 0.01);
  const minPadY = Math.max(12, height * 0.01);
  const maxContentW = Math.max(320, width - minPadX * 2);
  const maxContentH = Math.max(260, height - minPadY * 2);

  const scaledW = Math.min(maxContentW, baseContent.w * scale);
  const scaledH = Math.min(maxContentH, baseContent.h * scale);
  const centeredX = baseContent.x + baseContent.w / 2 - scaledW / 2;
  const centeredY = baseContent.y + baseContent.h / 2 - scaledH / 2;

  const content: Rect = {
    x: clamp(centeredX, minPadX, width - minPadX - scaledW),
    y: clamp(centeredY, minPadY, height - minPadY - scaledH),
    w: scaledW,
    h: scaledH
  };

  const headerH = Math.max(180, Math.min(content.h * 0.3, 320));
  const gap = Math.max(12, content.w * 0.015);
  const colW = (content.w - gap * 2) / 3;
  const bodyY = content.y + headerH + gap;
  const bodyH = content.h - headerH - gap;

  return {
    safe,
    content,
    header: {
      x: content.x,
      y: content.y,
      w: content.w,
      h: headerH
    },
    columns: [
      {
        x: content.x,
        y: bodyY,
        w: colW,
        h: bodyH
      },
      {
        x: content.x + colW + gap,
        y: bodyY,
        w: colW,
        h: bodyH
      },
      {
        x: content.x + (colW + gap) * 2,
        y: bodyY,
        w: colW,
        h: bodyH
      }
    ]
  };
}
