export function limitItems<T>(items: T[], maxCount: number): { visible: T[]; hidden: number } {
  const safeCount = Math.max(0, Math.floor(maxCount));
  const visible = items.slice(0, safeCount);
  return {
    visible,
    hidden: Math.max(0, items.length - visible.length)
  };
}
