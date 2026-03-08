export function lightenHex(hex: string, amount: number): string {
  return adjustHex(hex, Math.abs(amount));
}

export function darkenHex(hex: string, amount: number): string {
  return adjustHex(hex, -Math.abs(amount));
}

function adjustHex(hex: string, delta: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return hex;
  }

  const channels = [0, 2, 4].map((idx) => {
    const base = Number.parseInt(normalized.slice(idx, idx + 2), 16);
    const next = Math.max(0, Math.min(255, Math.round(base + 255 * delta)));
    return next.toString(16).padStart(2, "0");
  });

  return `#${channels.join("")}`;
}
