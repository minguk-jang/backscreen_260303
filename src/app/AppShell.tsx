import type { ChangeEvent } from "react";
import appIcon from "../icons/icon256.png";
import type { AppState, EventEntry, MealEntry, TimetableSlot, Weekday } from "../types";
import type { ChecklistItem } from "../utils/checklist";
import { DisplaySettingsPanel, type MonitorOption } from "../components/DisplaySettingsPanel";
import { MealImportPanel } from "../components/MealImportPanel";
import { SchoolInfoPanel } from "../components/SchoolInfoPanel";
import { SetupChecklist } from "../components/SetupChecklist";
import { StatusBar } from "../components/StatusBar";
import { ThemePanel } from "../components/ThemePanel";
import { TimetablePanel } from "../components/TimetablePanel";
import { TodoPanel } from "../components/TodoPanel";
import { UninstallPanel } from "../components/UninstallPanel";
import { WallpaperPreviewPanel } from "../components/WallpaperPreviewPanel";
import { EventEditor } from "../components/editors/EventEditor";
import { MealEditor } from "../components/editors/MealEditor";

interface AppShellProps {
  state: AppState;
  nowLabel: string;
  currentClassLabel: string;
  saving: boolean;
  status: string;
  previewDataUrl: string;
  setupChecklist: {
    items: ChecklistItem[];
    completed: number;
    total: number;
  };
  monthKey: string;
  monthMealsCount: number;
  monthEventsCount: number;
  monitors: MonitorOption[];
  onSave: () => Promise<void>;
  onSaveAndApply: () => Promise<void>;
  onApplyOnly: () => Promise<void>;
  onExportJson: () => void;
  onImportJson: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onToggleAutoApply: (checked: boolean) => void;
  onChangeSchoolField: (field: "schoolName" | "className", value: string) => void;
  onAddSlot: (day: Weekday) => void;
  onUpdateSlot: (day: Weekday, slotId: string, key: keyof TimetableSlot, value: string) => void;
  onDeleteSlot: (day: Weekday, slotId: string) => void;
  onChangeThemeField: (field: keyof AppState["theme"], value: string) => void;
  onChangeMonitorMode: (monitorMode: AppState["display"]["monitorMode"]) => void;
  onChangeMonitorId: (monitorId: string) => void;
  onChangeScale: (scalePercent: number) => void;
  onChangePosition: (offsetXPercent: number, offsetYPercent: number) => void;
  onAddMeal: () => void;
  onUpdateMeal: (mealId: string, entry: MealEntry) => void;
  onDeleteMeal: (mealId: string) => void;
  onAddEvent: () => void;
  onUpdateEvent: (eventId: string, entry: EventEntry) => void;
  onDeleteEvent: (eventId: string) => void;
  onAddTodo: (text: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onApplyImportedMeals: (
    imported: MealEntry[],
    meta: { fileName: string; sourceType: "hwp" | "hwpx" | "pdf" }
  ) => void;
  onUninstall: (confirmText: string) => Promise<void>;
}

export function AppShell({
  state,
  nowLabel,
  currentClassLabel,
  saving,
  status,
  previewDataUrl,
  setupChecklist,
  monthKey,
  monthMealsCount,
  monthEventsCount,
  monitors,
  onSave,
  onSaveAndApply,
  onApplyOnly,
  onExportJson,
  onImportJson,
  onToggleAutoApply,
  onChangeSchoolField,
  onAddSlot,
  onUpdateSlot,
  onDeleteSlot,
  onChangeThemeField,
  onChangeMonitorMode,
  onChangeMonitorId,
  onChangeScale,
  onChangePosition,
  onAddMeal,
  onUpdateMeal,
  onDeleteMeal,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onAddTodo,
  onDeleteTodo,
  onApplyImportedMeals,
  onUninstall
}: AppShellProps) {
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
          <strong>{nowLabel}</strong>
          <span>{currentClassLabel}</span>
        </div>
      </header>

      <section className="actions-row action-toolbar">
        <button className="btn-soft" disabled={saving} onClick={() => void onSave()}>
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
            onChange={(event) => onToggleAutoApply(event.target.checked)}
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
              <button onClick={onAddMeal}>날짜 추가</button>
            </div>
            <div className="list-body compact">
              {state.meals.map((meal) => (
                <MealEditor key={meal.id} meal={meal} onChange={(entry) => onUpdateMeal(meal.id, entry)} onDelete={() => onDeleteMeal(meal.id)} />
              ))}
              {state.meals.length === 0 && <p className="empty">등록된 급식이 없습니다.</p>}
            </div>
          </section>

          <TodoPanel todos={state.todos} onAddTodo={onAddTodo} onDeleteTodo={onDeleteTodo} />

          <section className="panel">
            <div className="panel-title-row">
              <h2>캘린더/행사</h2>
              <button onClick={onAddEvent}>일정 추가</button>
            </div>
            <div className="list-body compact">
              {state.events.map((eventEntry) => (
                <EventEditor
                  key={eventEntry.id}
                  entry={eventEntry}
                  onChange={(entry) => onUpdateEvent(eventEntry.id, entry)}
                  onDelete={() => onDeleteEvent(eventEntry.id)}
                />
              ))}
              {state.events.length === 0 && <p className="empty">등록된 일정이 없습니다.</p>}
            </div>
          </section>
        </section>

        <section className="right-rail">
          <WallpaperPreviewPanel
            imageDataUrl={previewDataUrl}
            currentClassLabel={currentClassLabel}
            monthMealsCount={monthMealsCount}
            monthEventsCount={monthEventsCount}
            displaySettings={state.display}
            onChangePosition={onChangePosition}
          />

          <SetupChecklist
            items={setupChecklist.items}
            completed={setupChecklist.completed}
            total={setupChecklist.total}
          />

          <SchoolInfoPanel schoolInfo={state.schoolInfo} onChangeField={onChangeSchoolField} />

          <TimetablePanel
            timetable={state.timetable}
            onAddSlot={onAddSlot}
            onUpdateSlot={onUpdateSlot}
            onDeleteSlot={onDeleteSlot}
          />

          <DisplaySettingsPanel
            settings={state.display}
            monitors={monitors}
            onChangeMonitorMode={onChangeMonitorMode}
            onChangeMonitorId={onChangeMonitorId}
            onChangeScale={onChangeScale}
            onResetPosition={() => {
              onChangePosition(0, 0);
            }}
          />

          <ThemePanel theme={state.theme} onChangeTheme={onChangeThemeField} />
          <UninstallPanel onUninstall={onUninstall} disabled={saving} />
        </section>
      </main>
    </div>
  );
}
