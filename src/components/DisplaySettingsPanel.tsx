import type { DisplaySettings, MonitorTargetMode } from "../types";

export interface MonitorOption {
  id: string;
  name: string;
  isPrimary: boolean;
}

interface DisplaySettingsPanelProps {
  settings: DisplaySettings;
  monitors: MonitorOption[];
  onChangeMonitorMode: (mode: MonitorTargetMode) => void;
  onChangeMonitorId: (monitorId: string) => void;
  onChangeScale: (scalePercent: number) => void;
}

export function DisplaySettingsPanel({
  settings,
  monitors,
  onChangeMonitorMode,
  onChangeMonitorId,
  onChangeScale
}: DisplaySettingsPanelProps) {
  return (
    <section className="panel">
      <div className="panel-title-row">
        <h2>디스플레이 설정</h2>
      </div>

      <div className="field-grid">
        <label>
          대상 모니터
          <select
            value={settings.monitorMode}
            onChange={(event) => onChangeMonitorMode(event.target.value as MonitorTargetMode)}
          >
            <option value="all">전체 모니터</option>
            <option value="primary">주 모니터</option>
            <option value="single">특정 모니터 1개</option>
          </select>
        </label>

        <label>
          모니터 선택
          <select
            value={settings.monitorId ?? ""}
            disabled={settings.monitorMode !== "single"}
            onChange={(event) => onChangeMonitorId(event.target.value)}
          >
            <option value="">선택하세요</option>
            {monitors.map((monitor) => (
              <option key={monitor.id} value={monitor.id}>
                {monitor.name}
                {monitor.isPrimary ? " (주 모니터)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label>
          콘텐츠 크기
          <input
            type="range"
            min={80}
            max={130}
            step={1}
            value={settings.contentScalePercent}
            onChange={(event) => onChangeScale(Number(event.target.value))}
          />
        </label>
        <p className="helper-text">{`현재 ${settings.contentScalePercent}%`}</p>
      </div>
    </section>
  );
}
