import "dayjs/locale/ko";
import dayjs from "dayjs";
import { AppShell } from "./app/AppShell";
import { useStudioApp } from "./app/useStudioApp";

dayjs.locale("ko");

export default function App() {
  const app = useStudioApp();

  return (
    <AppShell
      state={app.state}
      nowLabel={app.nowLabel}
      currentClassLabel={app.currentClassLabel}
      saving={app.saving}
      status={app.status}
      previewDataUrl={app.previewDataUrl}
      setupChecklist={app.setupChecklist}
      monthKey={app.monthKey}
      monthMealsCount={app.monthMealsCount}
      monthEventsCount={app.monthEventsCount}
      monitors={app.monitors}
      onSave={app.saveState}
      onSaveAndApply={app.saveAndApply}
      onApplyOnly={app.applyOnly}
      onExportJson={app.exportJson}
      onImportJson={app.importJson}
      onToggleAutoApply={app.setAutoApplyEveryMinute}
      onChangeSchoolField={app.setSchoolField}
      onAddSlot={app.addSlot}
      onUpdateSlot={app.updateSlot}
      onDeleteSlot={app.deleteSlot}
      onChangeThemeField={app.setThemeField}
      onChangeMonitorMode={(monitorMode) => app.setDisplayField("monitorMode", monitorMode)}
      onChangeMonitorId={(monitorId) => app.setDisplayField("monitorId", monitorId || undefined)}
      onChangeScale={(scalePercent) => app.setDisplayField("contentScalePercent", scalePercent)}
      onChangePosition={app.setDisplayOffsets}
      onAddMeal={app.addMeal}
      onUpdateMeal={app.updateMeal}
      onDeleteMeal={app.deleteMeal}
      onAddEvent={app.addEvent}
      onUpdateEvent={app.updateEvent}
      onDeleteEvent={app.deleteEvent}
      onAddTodo={app.addTodo}
      onDeleteTodo={app.deleteTodo}
      onApplyImportedMeals={app.applyImportedMeals}
      onUninstall={app.uninstall}
    />
  );
}
