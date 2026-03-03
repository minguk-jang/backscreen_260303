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

export function computeLayout(width: number, height: number): WallpaperLayout {
  const safe = {
    left: width * 0.12,
    top: height * 0.08,
    right: Math.max(24, width * 0.03),
    bottom: Math.max(24, height * 0.03)
  };

  const content: Rect = {
    x: safe.left,
    y: safe.top,
    w: Math.max(320, width - safe.left - safe.right),
    h: Math.max(260, height - safe.top - safe.bottom)
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
