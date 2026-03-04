import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { DisplaySettingsPanel, type MonitorOption } from "./components/DisplaySettingsPanel";
import { MealImportPanel } from "./components/MealImportPanel";
import { SchoolInfoPanel } from "./components/SchoolInfoPanel";
import { SetupChecklist } from "./components/SetupChecklist";
import { StatusBar } from "./components/StatusBar";
import { ThemePanel } from "./components/ThemePanel";
import { TimetablePanel } from "./components/TimetablePanel";
import { TodoPanel } from "./components/TodoPanel";
import { UninstallPanel } from "./components/UninstallPanel";
import { WallpaperPreviewPanel } from "./components/WallpaperPreviewPanel";
import { defaultState } from "./defaults";
import { getCurrentClass } from "./currentClass";
import { renderWallpaperImage } from "./renderWallpaper";
import appIcon from "./icons/icon256.png";
import type { AppState, EventEntry, MealEntry, TimetableSlot, Weekday } from "./types";
import { buildSetupChecklist } from "./utils/checklist";
import { filterEventsByMonth, filterMealsByMonth, upsertMealByDate } from "./utils/monthlyData";
import { sortTodos } from "./utils/todos";
import { validateState } from "./utils/validation";

dayjs.locale("ko");

interface ScreenSize {
  width: number;
  height: number;
}

interface WidgetStateSyncPayload {
  source: "studio" | "widget";
  state: AppState;
}

const LOCAL_STATE_SYNC_KEY = "backscreen:state-sync";

function deepCloneState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState;
}

function persistLocalState(state: AppState): void {
  try {
    window.localStorage.setItem(LOCAL_STATE_SYNC_KEY, JSON.stringify(state));
  } catch {
    // noop
  }
}

function restoreLocalState(): AppState | null {
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

export default function App() {
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

    bootstrap();

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
          const nextSerialized = JSON.stringify(next);
          return prevSerialized === nextSerialized ? prev : next;
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

      const next = mergeWithDefaults(event.payload.state);
      setState(next);
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
      if (dispose) {
        dispose();
      }
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
  }, [isLoaded, state.autoApplyEveryMinute]);

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
      if (dispose) {
        dispose();
      }
    };
  }, []);

  const setSchoolField = (field: "schoolName" | "className", value: string): void => {
    setState((prev) => ({
      ...prev,
      schoolInfo: {
        ...prev.schoolInfo,
        [field]: value
      }
    }));
  };

  const updateSlot = (day: Weekday, slotId: string, key: keyof TimetableSlot, value: string): void => {
    setState((prev) => ({
      ...prev,
      timetable: {
        ...prev.timetable,
        [day]: prev.timetable[day].map((slot) =>
          slot.id === slotId ? { ...slot, [key]: value } : slot
        )
      }
    }));
  };

  const addSlot = (day: Weekday): void => {
    setState((prev) => ({
      ...prev,
      timetable: {
        ...prev.timetable,
        [day]: [
          ...prev.timetable[day],
          {
            id: crypto.randomUUID(),
            periodLabel: `${prev.timetable[day].length + 1}교시`,
            subject: "",
            start: "09:00",
            end: "09:40"
          }
        ]
      }
    }));
  };

  const deleteSlot = (day: Weekday, slotId: string): void => {
    setState((prev) => ({
      ...prev,
      timetable: {
        ...prev.timetable,
        [day]: prev.timetable[day].filter((slot) => slot.id !== slotId)
      }
    }));
  };

  const setThemeField = (field: keyof AppState["theme"], value: string): void => {
    setState((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        [field]: value
      }
    }));
  };

  const setDisplayField = <K extends keyof AppState["display"]>(
    field: K,
    value: AppState["display"][K]
  ): void => {
    setState((prev) => ({
      ...prev,
      display: {
        ...prev.display,
        [field]: value
      }
    }));
  };

  const setDisplayOffsets = useCallback((offsetXPercent: number, offsetYPercent: number): void => {
    setState((prev) => ({
      ...prev,
      display: {
        ...prev.display,
        offsetXPercent: Math.max(-100, Math.min(100, offsetXPercent)),
        offsetYPercent: Math.max(-100, Math.min(100, offsetYPercent))
      }
    }));
  }, []);

  const addMeal = (): void => {
    setState((prev) => ({
      ...prev,
      meals: [
        ...prev.meals,
        {
          id: crypto.randomUUID(),
          date: dayjs().format("YYYY-MM-DD"),
          items: [""]
        }
      ]
    }));
  };

  const updateMeal = (mealId: string, entry: MealEntry): void => {
    setState((prev) => ({
      ...prev,
      meals: prev.meals.map((meal) => (meal.id === mealId ? entry : meal))
    }));
  };

  const deleteMeal = (mealId: string): void => {
    setState((prev) => ({
      ...prev,
      meals: prev.meals.filter((meal) => meal.id !== mealId)
    }));
  };

  const addEvent = (): void => {
    setState((prev) => ({
      ...prev,
      events: [
        ...prev.events,
        {
          id: crypto.randomUUID(),
          date: dayjs().format("YYYY-MM-DD"),
          title: "",
          details: "",
          color: "#f59e0b"
        }
      ]
    }));
  };

  const updateEvent = (eventId: string, entry: EventEntry): void => {
    setState((prev) => ({
      ...prev,
      events: prev.events.map((event) => (event.id === eventId ? entry : event))
    }));
  };

  const deleteEvent = (eventId: string): void => {
    setState((prev) => ({
      ...prev,
      events: prev.events.filter((event) => event.id !== eventId)
    }));
  };

  const onAddTodo = (text: string): void => {
    const trimmed = text.trim();
    if (!trimmed) {
      setStatus("할 일 내용을 입력해 주세요.");
      return;
    }

    setState((prev) => {
      const nextTodos = sortTodos([
        ...prev.todos,
        {
          id: crypto.randomUUID(),
          text: trimmed,
          done: false,
          order: prev.todos.length + 1,
          createdAt: new Date().toISOString()
        }
      ]);
      return {
        ...prev,
        todos: nextTodos
      };
    });
    setStatus("할 일을 추가했습니다.");
  };

  const onDeleteTodo = (todoId: string): void => {
    setState((prev) => ({
      ...prev,
      todos: sortTodos(prev.todos.filter((todo) => todo.id !== todoId))
    }));
    setStatus("할 일을 삭제했습니다.");
  };

  const onApplyImportedMeals = (
    imported: MealEntry[],
    meta: { fileName: string; sourceType: "hwp" | "hwpx" | "pdf" }
  ): void => {
    setState((prev) => {
      let nextMeals = prev.meals;
      for (const meal of imported) {
        nextMeals = upsertMealByDate(nextMeals, {
          ...meal,
          id: crypto.randomUUID()
        });
      }

      return {
        ...prev,
        meals: nextMeals,
        mealImport: {
          lastImportedAt: new Date().toISOString(),
          lastSourceType: meta.sourceType,
          lastFileName: meta.fileName
        }
      };
    });
    setStatus(`급식 업로드 반영 완료: ${imported.length}건`);
  };

  const saveState = async (message = "저장되었습니다."): Promise<void> => {
    const issues = validateState(state);
    if (issues.length > 0) {
      const firstIssue = issues[0];
      const error = new Error(firstIssue.message);
      setStatus(`검증 실패: ${firstIssue.message} ${firstIssue.fix}`);
      throw error;
    }

    setSaving(true);
    try {
      await invoke("save_app_state", { state });
      setStatus(message);
    } catch (error) {
      setStatus(`저장 실패: ${String(error)}`);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const applyWallpaper = async (snapshot: AppState): Promise<void> => {
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
  };

  const onSaveAndApply = async (): Promise<void> => {
    try {
      await saveState("저장 완료. 바탕화면 적용 중...");
      await applyWallpaper(state);
      setStatus("저장 및 바탕화면 적용이 완료되었습니다.");
    } catch (error) {
      setStatus(`적용 실패: ${String(error)}`);
    }
  };

  const onApplyOnly = async (): Promise<void> => {
    try {
      await applyWallpaper(state);
      setStatus("현재 입력값으로 바탕화면을 적용했습니다.");
    } catch (error) {
      setStatus(`적용 실패: ${String(error)}`);
    }
  };

  const onExportJson = (): void => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `backscreen-export-${dayjs().format("YYYYMMDD-HHmmss")}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
    setStatus("JSON 내보내기를 완료했습니다.");
  };

  const onImportJson = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as AppState;
      const next = mergeWithDefaults(parsed);
      setState(next);
      setStatus("JSON 가져오기 완료. 저장 후 적용하세요.");
    } catch (error) {
      setStatus(`JSON 가져오기 실패: ${String(error)}`);
    } finally {
      event.target.value = "";
    }
  };

  const onUninstall = async (confirmText: string): Promise<void> => {
    setStatus("앱 제거를 시작합니다...");
    try {
      await invoke("uninstall_app", { confirmText });
      setStatus("앱 제거 명령을 실행했습니다. 잠시 후 앱이 종료됩니다.");
    } catch (error) {
      setStatus(`앱 제거 실패: ${String(error)}`);
      throw error;
    }
  };

  return (
    <div className="app-shell">
      <header className="header-card">
        <div className="brand-block">
          <div className="brand-row">
            <img src={appIcon} alt="" aria-hidden="true" className="brand-icon" />
            <h1>BackScreen</h1>
          </div>
          <p>초등교실용 바탕화면 정보판 스튜디오</p>
        </div>
        <div className="header-time">
          <strong>{now.format("M월 D일 (ddd) HH:mm:ss")}</strong>
          <span>{currentClass ? `${currentClass.subject} 수업 중` : "수업 시간이 아닙니다"}</span>
        </div>
      </header>

      <section className="actions-row action-toolbar">
        <button className="btn-soft" disabled={saving} onClick={() => void saveState()}>
          저장
        </button>
        <button className="btn-primary" disabled={saving} onClick={() => void onSaveAndApply()}>
          저장 + 배경 적용
        </button>
        <button className="btn-soft" disabled={saving} onClick={() => void onApplyOnly()}>
          지금 배경 적용
        </button>
        <button className="btn-plain" onClick={onExportJson}>
          JSON 내보내기
        </button>
        <label className="file-input-label btn-plain">
          JSON 가져오기
          <input type="file" accept="application/json" onChange={(event) => void onImportJson(event)} />
        </label>
        <label className="toggle-inline">
          <input
            type="checkbox"
            checked={state.autoApplyEveryMinute}
            onChange={(event) =>
              setState((prev) => ({ ...prev, autoApplyEveryMinute: event.target.checked }))
            }
          />
          1분마다 자동 적용
        </label>
      </section>

      <StatusBar message={status} />

      <main className="dashboard-grid">
        <section className="left-rail">
          <MealImportPanel monthKey={monthKey} onApplyMeals={onApplyImportedMeals} />

          <section className="panel">
            <div className="panel-title-row">
              <h2>급식 메뉴</h2>
              <button onClick={addMeal}>날짜 추가</button>
            </div>
            <div className="list-body compact">
              {state.meals.map((meal) => (
                <MealEditor key={meal.id} meal={meal} onChange={(entry) => updateMeal(meal.id, entry)} onDelete={() => deleteMeal(meal.id)} />
              ))}
              {state.meals.length === 0 && <p className="empty">등록된 급식이 없습니다.</p>}
            </div>
          </section>

          <TodoPanel todos={state.todos} onAddTodo={onAddTodo} onDeleteTodo={onDeleteTodo} />

          <section className="panel">
            <div className="panel-title-row">
              <h2>캘린더/행사</h2>
              <button onClick={addEvent}>일정 추가</button>
            </div>
            <div className="list-body compact">
              {state.events.map((eventEntry) => (
                <EventEditor
                  key={eventEntry.id}
                  entry={eventEntry}
                  onChange={(entry) => updateEvent(eventEntry.id, entry)}
                  onDelete={() => deleteEvent(eventEntry.id)}
                />
              ))}
              {state.events.length === 0 && <p className="empty">등록된 일정이 없습니다.</p>}
            </div>
          </section>
        </section>

        <section className="right-rail">
          <WallpaperPreviewPanel
            imageDataUrl={previewDataUrl}
            currentClassLabel={currentClass ? `${currentClass.subject} 수업 중` : "수업 시간이 아닙니다"}
            monthMealsCount={monthlyMeals.length}
            monthEventsCount={monthlyEvents.length}
            displaySettings={state.display}
            onChangePosition={setDisplayOffsets}
          />

          <SetupChecklist
            items={setupChecklist.items}
            completed={setupChecklist.completed}
            total={setupChecklist.total}
          />

          <SchoolInfoPanel schoolInfo={state.schoolInfo} onChangeField={setSchoolField} />

          <TimetablePanel
            timetable={state.timetable}
            onAddSlot={addSlot}
            onUpdateSlot={updateSlot}
            onDeleteSlot={deleteSlot}
          />

          <DisplaySettingsPanel
            settings={state.display}
            monitors={monitors}
            onChangeMonitorMode={(mode) => setDisplayField("monitorMode", mode)}
            onChangeMonitorId={(monitorId) => setDisplayField("monitorId", monitorId || undefined)}
            onChangeScale={(scalePercent) => setDisplayField("contentScalePercent", scalePercent)}
            onResetPosition={() => {
              setDisplayOffsets(0, 0);
            }}
          />

          <ThemePanel theme={state.theme} onChangeTheme={setThemeField} />
          <UninstallPanel onUninstall={onUninstall} disabled={saving} />
        </section>
      </main>
    </div>
  );
}

interface MealEditorProps {
  meal: MealEntry;
  onChange: (entry: MealEntry) => void;
  onDelete: () => void;
}

function MealEditor({ meal, onChange, onDelete }: MealEditorProps) {
  return (
    <div className="entity-card">
      <div className="entity-head">
        <input
          type="date"
          value={meal.date}
          onChange={(event) => onChange({ ...meal, date: event.target.value })}
        />
        <button className="danger" onClick={onDelete}>
          삭제
        </button>
      </div>
      <textarea
        rows={4}
        value={meal.items.join("\n")}
        onChange={(event) =>
          onChange({
            ...meal,
            items: event.target.value.split("\n")
          })
        }
        placeholder="한 줄에 메뉴 하나씩 입력"
      />
    </div>
  );
}

interface EventEditorProps {
  entry: EventEntry;
  onChange: (entry: EventEntry) => void;
  onDelete: () => void;
}

function EventEditor({ entry, onChange, onDelete }: EventEditorProps) {
  return (
    <div className="entity-card">
      <div className="entity-head two-row">
        <input
          type="date"
          value={entry.date}
          onChange={(event) => onChange({ ...entry, date: event.target.value })}
        />
        <input type="color" value={entry.color} onChange={(event) => onChange({ ...entry, color: event.target.value })} />
        <button className="danger" onClick={onDelete}>
          삭제
        </button>
      </div>
      <input
        value={entry.title}
        placeholder="행사 제목"
        onChange={(event) => onChange({ ...entry, title: event.target.value })}
      />
      <textarea
        rows={3}
        value={entry.details}
        placeholder="행사 설명"
        onChange={(event) => onChange({ ...entry, details: event.target.value })}
      />
    </div>
  );
}

function mergeWithDefaults(incoming: AppState): AppState {
  const next = deepCloneState(defaultState);

  if (incoming.schoolInfo) {
    next.schoolInfo = {
      schoolName: incoming.schoolInfo.schoolName ?? next.schoolInfo.schoolName,
      className: incoming.schoolInfo.className ?? next.schoolInfo.className
    };
  }

  if (incoming.timetable) {
    for (const day of Object.keys(next.timetable) as Weekday[]) {
      const slots = incoming.timetable[day];
      if (Array.isArray(slots)) {
        next.timetable[day] = slots.map((slot) => ({
          id: slot.id ?? crypto.randomUUID(),
          periodLabel: slot.periodLabel ?? "",
          subject: slot.subject ?? "",
          start: slot.start ?? "09:00",
          end: slot.end ?? "09:40"
        }));
      }
    }
  }

  if (Array.isArray(incoming.meals)) {
    next.meals = incoming.meals.map((meal) => ({
      id: meal.id ?? crypto.randomUUID(),
      date: meal.date ?? dayjs().format("YYYY-MM-DD"),
      items: Array.isArray(meal.items) ? meal.items : []
    }));
  }

  if (Array.isArray(incoming.events)) {
    next.events = incoming.events.map((entry) => ({
      id: entry.id ?? crypto.randomUUID(),
      date: entry.date ?? dayjs().format("YYYY-MM-DD"),
      title: entry.title ?? "",
      details: entry.details ?? "",
      color: entry.color ?? "#f59e0b"
    }));
  }

  if (Array.isArray(incoming.todos)) {
    next.todos = incoming.todos.map((todo, index) => ({
      id: todo.id ?? crypto.randomUUID(),
      text: todo.text ?? "",
      done: Boolean(todo.done),
      order: Number.isFinite(todo.order) ? todo.order : index + 1,
      createdAt: todo.createdAt ?? new Date().toISOString(),
      doneAt: todo.doneAt
    }));
  }

  if (incoming.display) {
    next.display = {
      monitorMode:
        incoming.display.monitorMode === "all" ||
        incoming.display.monitorMode === "primary" ||
        incoming.display.monitorMode === "single"
          ? incoming.display.monitorMode
          : next.display.monitorMode,
      monitorId: incoming.display.monitorId ?? next.display.monitorId,
      contentScalePercent:
        typeof incoming.display.contentScalePercent === "number"
          ? incoming.display.contentScalePercent
          : next.display.contentScalePercent,
      offsetXPercent:
        typeof incoming.display.offsetXPercent === "number"
          ? incoming.display.offsetXPercent
          : next.display.offsetXPercent,
      offsetYPercent:
        typeof incoming.display.offsetYPercent === "number"
          ? incoming.display.offsetYPercent
          : next.display.offsetYPercent
    };
  }

  if (incoming.mealImport) {
    next.mealImport = {
      lastImportedAt: incoming.mealImport.lastImportedAt ?? next.mealImport.lastImportedAt,
      lastSourceType: incoming.mealImport.lastSourceType ?? next.mealImport.lastSourceType,
      lastFileName: incoming.mealImport.lastFileName ?? next.mealImport.lastFileName
    };
  }

  if (incoming.theme) {
    next.theme = {
      background: incoming.theme.background ?? next.theme.background,
      panel: incoming.theme.panel ?? next.theme.panel,
      panelAlt: incoming.theme.panelAlt ?? next.theme.panelAlt,
      primaryText: incoming.theme.primaryText ?? next.theme.primaryText,
      accent: incoming.theme.accent ?? next.theme.accent
    };
  }

  if (typeof incoming.autoApplyEveryMinute === "boolean") {
    next.autoApplyEveryMinute = incoming.autoApplyEveryMinute;
  }

  return next;
}
