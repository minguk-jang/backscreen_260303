import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultState } from "../defaults";
import { getCurrentClass } from "../currentClass";
import { renderWallpaperImage } from "../renderWallpaper";
import type { AppState } from "../types";
import { buildSetupChecklist } from "../utils/checklist";
import { filterEventsByMonth, filterMealsByMonth } from "../utils/monthlyData";
import { mergeWithDefaults } from "./state";
import { persistLocalState, restoreLocalState } from "./storage";
import { LOCAL_STATE_SYNC_KEY } from "./sync";
import type { ScreenSize, WidgetStateSyncPayload } from "./types";
import type { MonitorOption } from "../components/DisplaySettingsPanel";
import { useStudioActions } from "./useStudioActions";

export function useStudioApp() {
  const [state, setState] = useState<AppState>(defaultState);
  const [monitors, setMonitors] = useState<MonitorOption[]>([
    { id: "primary", name: "주 모니터", isPrimary: true }
  ]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("초기화 중...");
  const [now, setNow] = useState(dayjs());
  const [hasAppliedOnce, setHasAppliedOnce] = useState(false);
  const stateRef = useRef(state);

  const currentClass = useMemo(() => getCurrentClass(state, now), [state, now]);
  const currentClassLabel = currentClass ? `${currentClass.subject} 수업 중` : "수업 시간이 아닙니다";
  const previewClockKey = useMemo(() => now.format("YYYY-MM-DD HH:mm"), [now]);
  const monthKey = useMemo(() => now.format("YYYY-MM"), [now]);
  const monthlyMeals = useMemo(() => filterMealsByMonth(state.meals, monthKey), [state.meals, monthKey]);
  const monthlyEvents = useMemo(() => filterEventsByMonth(state.events, monthKey), [state.events, monthKey]);
  const previewDataUrl = useMemo(() => {
    try {
      return renderWallpaperImage(state, 1366, 768);
    } catch {
      return "";
    }
  }, [state, previewClockKey]);
  const setupChecklist = useMemo(
    () => buildSetupChecklist(state, now.format("YYYY-MM-DD"), hasAppliedOnce),
    [state, now, hasAppliedOnce]
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const loaded = await invoke<AppState>("load_app_state");
        if (!active) {
          return;
        }

        if (loaded && loaded.timetable) {
          setState(mergeWithDefaults(loaded));
          setStatus("저장된 데이터를 불러왔습니다.");
        } else {
          setStatus("기본 템플릿으로 시작합니다.");
        }
      } catch (error) {
        const localFallback = restoreLocalState();
        if (localFallback) {
          setState(mergeWithDefaults(localFallback));
          setStatus("로컬 미리보기 상태를 불러왔습니다.");
        } else {
          setStatus(`불러오기 실패: ${String(error)}`);
        }
      } finally {
        if (active) {
          setIsLoaded(true);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    invoke<unknown>("list_display_monitors")
      .then((raw) => {
        if (!active || !Array.isArray(raw) || raw.length === 0) {
          return;
        }

        const next = raw
          .map((entry) => {
            if (!entry || typeof entry !== "object") {
              return null;
            }

            const monitor = entry as { id?: unknown; name?: unknown; isPrimary?: unknown };
            if (typeof monitor.id !== "string" || typeof monitor.name !== "string") {
              return null;
            }

            return {
              id: monitor.id,
              name: monitor.name,
              isPrimary: Boolean(monitor.isPrimary)
            } satisfies MonitorOption;
          })
          .filter((monitor): monitor is MonitorOption => monitor !== null);

        if (next.length > 0) {
          setMonitors(next);
        }
      })
      .catch(() => {
        // Keep fallback list when backend command is unavailable (web preview, test).
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    persistLocalState(state);

    emit("widget://state-updated", {
      source: "studio",
      state
    } satisfies WidgetStateSyncPayload).catch(() => {
      // Ignore in pure web preview mode.
    });
  }, [isLoaded, state]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LOCAL_STATE_SYNC_KEY || !event.newValue) {
        return;
      }

      try {
        const incoming = JSON.parse(event.newValue) as AppState;
        setState((prev) => {
          const prevSerialized = JSON.stringify(prev);
          const next = mergeWithDefaults(incoming);
          return prevSerialized === JSON.stringify(next) ? prev : next;
        });
      } catch {
        // noop
      }
    };

    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let dispose: (() => void) | null = null;

    listen<WidgetStateSyncPayload>("widget://state-updated", (event) => {
      if (!mounted || event.payload?.source !== "widget") {
        return;
      }

      setState(mergeWithDefaults(event.payload.state));
      setStatus("위젯 변경사항이 반영되었습니다.");
    })
      .then((unlisten) => {
        dispose = unlisten;
      })
      .catch(() => {
        // Ignore in pure web preview mode.
      });

    return () => {
      mounted = false;
      dispose?.();
    };
  }, []);

  useEffect(() => {
    const ticker = window.setInterval(() => {
      setNow(dayjs());
    }, 1000);
    return () => {
      window.clearInterval(ticker);
    };
  }, []);

  const applyWallpaper = useCallback(async (snapshot: AppState): Promise<void> => {
    const size = await invoke<ScreenSize>("get_primary_screen_size", {
      monitorMode: snapshot.display.monitorMode,
      monitorId: snapshot.display.monitorId ?? null
    });
    const dataUrl = renderWallpaperImage(snapshot, size.width, size.height);
    const pngBase64 = dataUrl.split(",")[1];
    if (!pngBase64) {
      throw new Error("이미지 인코딩 실패");
    }
    await invoke("apply_wallpaper_image", {
      pngBase64,
      monitorMode: snapshot.display.monitorMode,
      monitorId: snapshot.display.monitorId ?? null
    });
    setHasAppliedOnce(true);
  }, []);

  useEffect(() => {
    if (!isLoaded || !state.autoApplyEveryMinute) {
      return;
    }

    const interval = window.setInterval(() => {
      applyWallpaper(stateRef.current).catch((error) => {
        setStatus(`자동 적용 실패: ${String(error)}`);
      });
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [applyWallpaper, isLoaded, state.autoApplyEveryMinute]);

  useEffect(() => {
    let isMounted = true;
    let dispose: (() => void) | null = null;

    listen("tray://apply-now", () => {
      if (!isMounted) {
        return;
      }
      applyWallpaper(stateRef.current)
        .then(() => {
          setStatus("트레이 요청으로 바탕화면을 적용했습니다.");
        })
        .catch((error) => {
          setStatus(`트레이 적용 실패: ${String(error)}`);
        });
    })
      .then((unlisten) => {
        dispose = unlisten;
      })
      .catch((error) => {
        setStatus(`트레이 이벤트 등록 실패: ${String(error)}`);
      });

    return () => {
      isMounted = false;
      dispose?.();
    };
  }, [applyWallpaper]);

  const actions = useStudioActions({
    state,
    setState,
    setSaving,
    setStatus,
    applyWallpaper
  });

  return {
    state,
    monitors,
    saving,
    status,
    nowLabel: now.format("M월 D일 (ddd) HH:mm:ss"),
    currentClassLabel,
    previewDataUrl,
    setupChecklist,
    monthKey,
    monthMealsCount: monthlyMeals.length,
    monthEventsCount: monthlyEvents.length,
    ...actions
  };
}
