import type { AppState } from "../types";

export interface ScreenSize {
  width: number;
  height: number;
}

export interface WidgetStateSyncPayload {
  source: "studio" | "widget";
  state: AppState;
}
