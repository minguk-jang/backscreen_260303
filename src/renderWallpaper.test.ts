import { describe, expect, it } from "vitest";
import { defaultState } from "./defaults";
import { getWallpaperLayout, renderWallpaperImage } from "./renderWallpaper";

describe("renderWallpaperImage", () => {
  it("returns png data url", () => {
    const data = renderWallpaperImage(defaultState, 1920, 1080);
    expect(data.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("exposes safe-area layout ratio", () => {
    const layout = getWallpaperLayout(1920, 1080);
    expect(layout.safe.left).toBeCloseTo(230.4, 1);
    expect(layout.safe.top).toBeCloseTo(86.4, 1);
  });

  it("renders safely with long strings on 1366x768", () => {
    const state = {
      ...defaultState,
      schoolInfo: {
        schoolName: "아주아주아주아주긴학교이름테스트초등학교",
        className: "6학년 12반 긴 반이름 테스트"
      },
      meals: [
        {
          id: "m1",
          date: "2026-03-03",
          items: [
            "아주 긴 급식 메뉴 이름 테스트 1",
            "아주 긴 급식 메뉴 이름 테스트 2",
            "아주 긴 급식 메뉴 이름 테스트 3",
            "아주 긴 급식 메뉴 이름 테스트 4",
            "아주 긴 급식 메뉴 이름 테스트 5",
            "아주 긴 급식 메뉴 이름 테스트 6",
            "아주 긴 급식 메뉴 이름 테스트 7",
            "아주 긴 급식 메뉴 이름 테스트 8"
          ]
        }
      ],
      events: [
        {
          id: "e1",
          date: "2026-03-03",
          title: "아주 긴 행사 제목 아주 긴 행사 제목 아주 긴 행사 제목",
          details: "아주 긴 상세 설명 아주 긴 상세 설명 아주 긴 상세 설명 아주 긴 상세 설명",
          color: "#f59e0b"
        }
      ]
    };

    const data = renderWallpaperImage(state, 1366, 768);
    expect(data.startsWith("data:image/png;base64,")).toBe(true);
  });
});
