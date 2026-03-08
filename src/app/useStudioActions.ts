import { invoke } from "@tauri-apps/api/core";
import dayjs from "dayjs";
import { useCallback, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import type { AppState, EventEntry, MealEntry, TimetableSlot, Weekday } from "../types";
import { upsertMealByDate } from "../utils/monthlyData";
import { sortTodos } from "../utils/todos";
import { validateState } from "../utils/validation";
import { mergeWithDefaults } from "./state";

interface UseStudioActionsInput {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  setSaving: Dispatch<SetStateAction<boolean>>;
  setStatus: Dispatch<SetStateAction<string>>;
  applyWallpaper: (snapshot: AppState) => Promise<void>;
}

export function useStudioActions({
  state,
  setState,
  setSaving,
  setStatus,
  applyWallpaper
}: UseStudioActionsInput) {
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
  }, [setState]);

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

  const addTodo = (text: string): void => {
    const trimmed = text.trim();
    if (!trimmed) {
      setStatus("할 일 내용을 입력해 주세요.");
      return;
    }

    setState((prev) => ({
      ...prev,
      todos: sortTodos([
        ...prev.todos,
        {
          id: crypto.randomUUID(),
          text: trimmed,
          done: false,
          order: prev.todos.length + 1,
          createdAt: new Date().toISOString()
        }
      ])
    }));
    setStatus("할 일을 추가했습니다.");
  };

  const deleteTodo = (todoId: string): void => {
    setState((prev) => ({
      ...prev,
      todos: sortTodos(prev.todos.filter((todo) => todo.id !== todoId))
    }));
    setStatus("할 일을 삭제했습니다.");
  };

  const applyImportedMeals = (
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
      setStatus(`검증 실패: ${firstIssue.message} ${firstIssue.fix}`);
      throw new Error(firstIssue.message);
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

  const saveAndApply = async (): Promise<void> => {
    try {
      await saveState("저장 완료. 바탕화면 적용 중...");
      await applyWallpaper(state);
      setStatus("저장 및 바탕화면 적용이 완료되었습니다.");
    } catch (error) {
      setStatus(`적용 실패: ${String(error)}`);
    }
  };

  const applyOnly = async (): Promise<void> => {
    try {
      await applyWallpaper(state);
      setStatus("현재 입력값으로 바탕화면을 적용했습니다.");
    } catch (error) {
      setStatus(`적용 실패: ${String(error)}`);
    }
  };

  const exportJson = (): void => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `backscreen-export-${dayjs().format("YYYYMMDD-HHmmss")}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
    setStatus("JSON 내보내기를 완료했습니다.");
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as AppState;
      setState(mergeWithDefaults(parsed));
      setStatus("JSON 가져오기 완료. 저장 후 적용하세요.");
    } catch (error) {
      setStatus(`JSON 가져오기 실패: ${String(error)}`);
    } finally {
      event.target.value = "";
    }
  };

  const uninstall = async (confirmText: string): Promise<void> => {
    setStatus("앱 제거를 시작합니다...");
    try {
      await invoke("uninstall_app", { confirmText });
      setStatus("앱 제거 명령을 실행했습니다. 잠시 후 앱이 종료됩니다.");
    } catch (error) {
      setStatus(`앱 제거 실패: ${String(error)}`);
      throw error;
    }
  };

  return {
    saveState,
    saveAndApply,
    applyOnly,
    exportJson,
    importJson,
    setSchoolField,
    addSlot,
    updateSlot,
    deleteSlot,
    setThemeField,
    setDisplayField,
    setDisplayOffsets,
    addMeal,
    updateMeal,
    deleteMeal,
    addEvent,
    updateEvent,
    deleteEvent,
    addTodo,
    deleteTodo,
    applyImportedMeals,
    uninstall,
    setAutoApplyEveryMinute: (checked: boolean) => {
      setState((prev) => ({ ...prev, autoApplyEveryMinute: checked }));
    }
  };
}
