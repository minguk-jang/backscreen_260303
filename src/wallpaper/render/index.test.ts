import { describe, expect, it } from "vitest";
import { defaultState } from "../../defaults";
import {
  getWallpaperLayout as getCompatWallpaperLayout,
  renderWallpaperImage as renderCompatWallpaperImage
} from "../../renderWallpaper";
import { getWallpaperLayout, renderWallpaperImage } from "./index";

describe("wallpaper render entrypoints", () => {
  it("keeps the new render module and compatibility entry in sync", () => {
    const compatLayout = getCompatWallpaperLayout(1920, 1080, defaultState.display);
    const modularLayout = getWallpaperLayout(1920, 1080, defaultState.display);

    expect(modularLayout).toEqual(compatLayout);

    const compatImage = renderCompatWallpaperImage(defaultState, 1366, 768);
    const modularImage = renderWallpaperImage(defaultState, 1366, 768);

    expect(modularImage.startsWith("data:image/png;base64,")).toBe(true);
    expect(modularImage).toBe(compatImage);
  });
});
