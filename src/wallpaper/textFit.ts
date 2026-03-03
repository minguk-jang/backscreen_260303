interface FitOptions {
  maxWidth: number;
  maxFont: number;
  minFont: number;
  measure: (text: string, fontSize: number) => number;
}

export function fitText(input: string, opts: FitOptions): { text: string; fontSize: number } {
  if (opts.maxWidth <= 0 || opts.minFont <= 0) {
    return { text: "", fontSize: Math.max(1, opts.minFont) };
  }

  const text = input ?? "";

  for (let size = opts.maxFont; size >= opts.minFont; size -= 1) {
    if (opts.measure(text, size) <= opts.maxWidth) {
      return { text, fontSize: size };
    }
  }

  let truncated = text;
  const minSize = opts.minFont;
  while (truncated.length > 1 && opts.measure(`${truncated}…`, minSize) > opts.maxWidth) {
    truncated = truncated.slice(0, -1);
  }

  if (opts.measure(`${truncated}…`, minSize) > opts.maxWidth) {
    return { text: "", fontSize: minSize };
  }

  return { text: `${truncated}…`, fontSize: minSize };
}
