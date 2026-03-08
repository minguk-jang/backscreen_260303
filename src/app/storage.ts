import type { AppState } from "../types";
import { LOCAL_STATE_SYNC_KEY } from "./sync";

export function deepCloneState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState;
}

export function persistLocalState(state: AppState): void {
  try {
    window.localStorage.setItem(LOCAL_STATE_SYNC_KEY, JSON.stringify(state));
  } catch {
    // noop
  }
}

export function restoreLocalState(): AppState | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_STATE_SYNC_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
}
