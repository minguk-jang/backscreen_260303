import { describe, expect, it } from "vitest";
import { defaultState } from "./defaults";
import { renderWallpaperImage } from "./renderWallpaper";

describe("renderWallpaperImage", () => {
  it("returns png data url", () => {
    const data = renderWallpaperImage(defaultState, 1920, 1080);
    expect(data.startsWith("data:image/png;base64,")).toBe(true);
  });
});
