import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { defaultState } from "../defaults";
import type { AppState } from "../types";

export function useAppState() {
  const [state, setState] = useState<AppState>(defaultState);

  const save = async (): Promise<void> => {
    await invoke("save_app_state", { state });
  };

  const saveAndApply = async (): Promise<void> => {
    await save();
  };

  return {
    state,
    setState,
    save,
    saveAndApply
  };
}
