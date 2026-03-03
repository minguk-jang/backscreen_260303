import type { ThemeSettings } from "../types";

interface ThemePanelProps {
  theme: ThemeSettings;
  onChangeTheme: (field: keyof ThemeSettings, value: string) => void;
}

export function ThemePanel({ theme, onChangeTheme }: ThemePanelProps) {
  return (
    <section className="panel">
      <h2>테마</h2>
      <div className="field-grid five-col">
        <label>
          배경색
          <input type="color" value={theme.background} onChange={(event) => onChangeTheme("background", event.target.value)} />
        </label>
        <label>
          패널색
          <input type="color" value={theme.panel} onChange={(event) => onChangeTheme("panel", event.target.value)} />
        </label>
        <label>
          카드색
          <input type="color" value={theme.panelAlt} onChange={(event) => onChangeTheme("panelAlt", event.target.value)} />
        </label>
        <label>
          글자색
          <input
            type="color"
            value={theme.primaryText}
            onChange={(event) => onChangeTheme("primaryText", event.target.value)}
          />
        </label>
        <label>
          강조색
          <input type="color" value={theme.accent} onChange={(event) => onChangeTheme("accent", event.target.value)} />
        </label>
      </div>
    </section>
  );
}
