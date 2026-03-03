import { useState } from "react";

interface UninstallPanelProps {
  onUninstall: (confirmText: string) => Promise<void>;
  disabled?: boolean;
}

const REQUIRED_CONFIRM_TEXT = "삭제";

export function UninstallPanel({ onUninstall, disabled = false }: UninstallPanelProps) {
  const [confirmText, setConfirmText] = useState("");
  const [running, setRunning] = useState(false);

  const canSubmit = confirmText === REQUIRED_CONFIRM_TEXT && !disabled && !running;

  const handleUninstall = async (): Promise<void> => {
    if (!canSubmit) {
      return;
    }

    setRunning(true);
    try {
      await onUninstall(confirmText);
    } catch {
      // Parent handles detailed status messaging.
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="panel uninstall-panel">
      <h2>앱 제거</h2>
      <p className="helper-text uninstall-warning">
        앱과 모든 사용자 데이터(app.db/backups/wallpaper)가 완전 삭제됩니다. 실행 전 반드시 확인하세요.
      </p>

      <label htmlFor="uninstall-confirm-input">
        확인 입력
        <input
          id="uninstall-confirm-input"
          aria-label="확인 입력"
          type="text"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder="삭제"
          autoComplete="off"
        />
      </label>

      <button className="danger" onClick={() => void handleUninstall()} disabled={!canSubmit}>
        {running ? "제거 실행 중..." : "앱 제거 실행"}
      </button>
    </section>
  );
}
