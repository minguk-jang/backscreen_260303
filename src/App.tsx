import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { defaultState, weekdayOptions } from "./defaults";
import { getCurrentClass } from "./currentClass";
import { renderWallpaperImage } from "./renderWallpaper";
import type { AppState, EventEntry, MealEntry, TimetableSlot, Weekday } from "./types";
import { validateState } from "./utils/validation";

dayjs.locale("ko");

interface ScreenSize {
  width: number;
  height: number;
}

const weekdayLabel: Record<Weekday, string> = {
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금"
};

function deepCloneState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState;
}

export default function App() {
  const [state, setState] = useState<AppState>(defaultState);
  const [selectedDay, setSelectedDay] = useState<Weekday>("mon");
  const [isLoaded, setIsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("초기화 중...");
  const [now, setNow] = useState(dayjs());
  const stateRef = useRef(state);

  const currentClass = useMemo(() => getCurrentClass(state, now), [state, now]);

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
          setState(loaded);
          setStatus("저장된 데이터를 불러왔습니다.");
        } else {
          setStatus("기본 템플릿으로 시작합니다.");
        }
      } catch (error) {
        setStatus(`불러오기 실패: ${String(error)}`);
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

  const updateSlot = (slotId: string, key: keyof TimetableSlot, value: string): void => {
    setState((prev) => ({
      ...prev,
      timetable: {
        ...prev.timetable,
        [selectedDay]: prev.timetable[selectedDay].map((slot) =>
          slot.id === slotId ? { ...slot, [key]: value } : slot
        )
      }
    }));
  };

  const addSlot = (): void => {
    setState((prev) => ({
      ...prev,
      timetable: {
        ...prev.timetable,
        [selectedDay]: [
          ...prev.timetable[selectedDay],
          {
            id: crypto.randomUUID(),
            periodLabel: `${prev.timetable[selectedDay].length + 1}교시`,
            subject: "",
            start: "09:00",
            end: "09:40"
          }
        ]
      }
    }));
  };

  const deleteSlot = (slotId: string): void => {
    setState((prev) => ({
      ...prev,
      timetable: {
        ...prev.timetable,
        [selectedDay]: prev.timetable[selectedDay].filter((slot) => slot.id !== slotId)
      }
    }));
  };

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
    const size = await invoke<ScreenSize>("get_primary_screen_size");
    const dataUrl = renderWallpaperImage(snapshot, size.width, size.height);
    const pngBase64 = dataUrl.split(",")[1];
    if (!pngBase64) {
      throw new Error("이미지 인코딩 실패");
    }
    await invoke("apply_wallpaper_image", { pngBase64 });
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

  return (
    <div className="app-shell">
      <header className="header-card">
        <div>
          <h1>BackScreen</h1>
          <p>윈도우 바탕화면 정보판 편집기</p>
        </div>
        <div className="header-time">
          <strong>{now.format("M월 D일 (ddd) HH:mm:ss")}</strong>
          <span>{currentClass ? `${currentClass.subject} 수업 중` : "수업 시간이 아닙니다"}</span>
        </div>
      </header>

      <section className="actions-row">
        <button disabled={saving} onClick={() => void saveState()}>
          저장
        </button>
        <button disabled={saving} onClick={() => void onSaveAndApply()}>
          저장 + 배경 적용
        </button>
        <button disabled={saving} onClick={() => void onApplyOnly()}>
          지금 배경 적용
        </button>
        <button onClick={onExportJson}>JSON 내보내기</button>
        <label className="file-input-label">
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

      <p className="status-line">{status}</p>

      <main className="layout-grid">
        <section className="panel">
          <h2>학교 정보</h2>
          <div className="field-grid two-col">
            <label>
              학교명
              <input
                value={state.schoolInfo.schoolName}
                onChange={(event) => setSchoolField("schoolName", event.target.value)}
                placeholder="예: 새봄초등학교"
              />
            </label>
            <label>
              학급명
              <input
                value={state.schoolInfo.className}
                onChange={(event) => setSchoolField("className", event.target.value)}
                placeholder="예: 5학년 1반"
              />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title-row">
            <h2>시간표</h2>
            <button onClick={addSlot}>교시 추가</button>
          </div>
          <div className="day-tabs">
            {weekdayOptions.map((day) => (
              <button
                key={day.key}
                className={selectedDay === day.key ? "active" : ""}
                onClick={() => setSelectedDay(day.key)}
              >
                {day.label}요일
              </button>
            ))}
          </div>

          <div className="list-body">
            {state.timetable[selectedDay].map((slot) => (
              <div className="list-row timetable-row" key={slot.id}>
                <input
                  value={slot.periodLabel}
                  onChange={(event) => updateSlot(slot.id, "periodLabel", event.target.value)}
                />
                <input
                  value={slot.subject}
                  onChange={(event) => updateSlot(slot.id, "subject", event.target.value)}
                  placeholder="과목"
                />
                <input type="time" value={slot.start} onChange={(event) => updateSlot(slot.id, "start", event.target.value)} />
                <input type="time" value={slot.end} onChange={(event) => updateSlot(slot.id, "end", event.target.value)} />
                <button className="danger" onClick={() => deleteSlot(slot.id)}>
                  삭제
                </button>
              </div>
            ))}
            {state.timetable[selectedDay].length === 0 && <p className="empty">{weekdayLabel[selectedDay]}요일 교시 없음</p>}
          </div>
        </section>

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

        <section className="panel">
          <h2>테마</h2>
          <div className="field-grid five-col">
            <label>
              배경색
              <input
                type="color"
                value={state.theme.background}
                onChange={(event) =>
                  setState((prev) => ({
                    ...prev,
                    theme: { ...prev.theme, background: event.target.value }
                  }))
                }
              />
            </label>
            <label>
              패널색
              <input
                type="color"
                value={state.theme.panel}
                onChange={(event) =>
                  setState((prev) => ({
                    ...prev,
                    theme: { ...prev.theme, panel: event.target.value }
                  }))
                }
              />
            </label>
            <label>
              카드색
              <input
                type="color"
                value={state.theme.panelAlt}
                onChange={(event) =>
                  setState((prev) => ({
                    ...prev,
                    theme: { ...prev.theme, panelAlt: event.target.value }
                  }))
                }
              />
            </label>
            <label>
              글자색
              <input
                type="color"
                value={state.theme.primaryText}
                onChange={(event) =>
                  setState((prev) => ({
                    ...prev,
                    theme: { ...prev.theme, primaryText: event.target.value }
                  }))
                }
              />
            </label>
            <label>
              강조색
              <input
                type="color"
                value={state.theme.accent}
                onChange={(event) =>
                  setState((prev) => ({
                    ...prev,
                    theme: { ...prev.theme, accent: event.target.value }
                  }))
                }
              />
            </label>
          </div>
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
