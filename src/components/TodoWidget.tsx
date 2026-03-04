import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { defaultState } from "../defaults";
import type { AppState, TodoEntry } from "../types";
import { sortTodos, toggleTodo } from "../utils/todos";

interface TodoWidgetProps {
  todos?: TodoEntry[];
  mealsTodayItems?: string[];
  onToggleTodo?: (todoId: string, done: boolean) => void;
}

interface WidgetStateSyncPayload {
  source: "studio" | "widget";
  state: AppState;
}

const LOCAL_STATE_SYNC_KEY = "backscreen:state-sync";

function mergeWidgetState(incoming: AppState): AppState {
  return {
    ...defaultState,
    ...incoming,
    schoolInfo: { ...defaultState.schoolInfo, ...(incoming.schoolInfo ?? {}) },
    timetable: { ...defaultState.timetable, ...(incoming.timetable ?? {}) },
    theme: { ...defaultState.theme, ...(incoming.theme ?? {}) },
    meals: Array.isArray(incoming.meals) ? incoming.meals : defaultState.meals,
    events: Array.isArray(incoming.events) ? incoming.events : defaultState.events,
    todos: Array.isArray(incoming.todos) ? incoming.todos : defaultState.todos
  };
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

export function TodoWidget({ todos, mealsTodayItems, onToggleTodo }: TodoWidgetProps) {
  const [state, setState] = useState<AppState>(defaultState);
  const [status, setStatus] = useState("불러오는 중...");
  const controlledMode = Array.isArray(todos);

  useEffect(() => {
    if (controlledMode) {
      return;
    }

    let active = true;
    invoke<AppState>("load_app_state")
      .then((loaded) => {
        if (!active) {
          return;
        }
        const next = mergeWidgetState(loaded);
        setState(next);
        persistLocalState(next);
        setStatus("실시간 체크 가능");
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        const localFallback = restoreLocalState();
        if (localFallback) {
          setState(mergeWidgetState(localFallback));
          setStatus("로컬 상태로 실행 중");
        } else {
          setStatus(`불러오기 실패: ${String(error)}`);
        }
      });

    return () => {
      active = false;
    };
  }, [controlledMode]);

  useEffect(() => {
    if (controlledMode) {
      return;
    }

    let mounted = true;
    let dispose: (() => void) | null = null;

    listen<WidgetStateSyncPayload>("widget://state-updated", (event) => {
      if (!mounted || event.payload?.source !== "studio") {
        return;
      }
      const next = mergeWidgetState(event.payload.state);
      setState(next);
      persistLocalState(next);
      setStatus("스튜디오 변경 반영됨");
    })
      .then((unlisten) => {
        dispose = unlisten;
      })
      .catch(() => {
        // Ignore in pure web preview mode.
      });

    const onStorage = (event: StorageEvent) => {
      if (event.key !== LOCAL_STATE_SYNC_KEY || !event.newValue) {
        return;
      }
      try {
        const incoming = JSON.parse(event.newValue) as AppState;
        const next = mergeWidgetState(incoming);
        setState(next);
        setStatus("미리보기 동기화됨");
      } catch {
        // noop
      }
    };

    window.addEventListener("storage", onStorage);
    return () => {
      mounted = false;
      if (dispose) {
        dispose();
      }
      window.removeEventListener("storage", onStorage);
    };
  }, [controlledMode]);

  const today = dayjs().format("YYYY-MM-DD");
  const resolvedMeals =
    mealsTodayItems ?? state.meals.find((entry) => entry.date === today)?.items ?? [];
  const resolvedTodos = useMemo(() => sortTodos(todos ?? state.todos), [todos, state.todos]);

  const handleToggle = (todoId: string, done: boolean): void => {
    if (controlledMode) {
      onToggleTodo?.(todoId, done);
      return;
    }

    setState((prev) => {
      const next = {
        ...prev,
        todos: toggleTodo(prev.todos, todoId, done)
      };

      persistLocalState(next);

      invoke("save_app_state", { state: next })
        .then(() => {
          setStatus("체크 상태 저장됨");
        })
        .catch((error) => {
          setStatus(`저장 실패: ${String(error)}`);
        });

      emit("widget://state-updated", {
        source: "widget",
        state: next
      } satisfies WidgetStateSyncPayload).catch(() => {
        // Ignore in pure web preview mode.
      });

      return next;
    });
  };

  return (
    <main className="widget-shell" aria-label="todo-widget">
      <h2>오늘의 급식 & 할 일</h2>
      <p className="widget-date">{dayjs().format("M월 D일 (ddd)")}</p>

      <section className="widget-card">
        <strong>오늘 급식</strong>
        <ul className="widget-list">
          {resolvedMeals.length > 0 ? (
            resolvedMeals.slice(0, 6).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)
          ) : (
            <li>급식 정보 없음</li>
          )}
        </ul>
      </section>

      <section className="widget-card">
        <strong>Todo</strong>
        <ul className="widget-list todo-check-list">
          {resolvedTodos.length > 0 ? (
            resolvedTodos.map((todo) => (
              <li key={todo.id}>
                <label className="todo-check-row">
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={(event) => handleToggle(todo.id, event.target.checked)}
                  />
                  <span className={todo.done ? "todo-done" : ""}>{todo.text}</span>
                </label>
              </li>
            ))
          ) : (
            <li>할 일 없음</li>
          )}
        </ul>
      </section>

      {!controlledMode && <p className="widget-status">{status}</p>}
    </main>
  );
}
