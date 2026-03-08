import type { EventEntry } from "../../types";

interface EventEditorProps {
  entry: EventEntry;
  onChange: (entry: EventEntry) => void;
  onDelete: () => void;
}

export function EventEditor({ entry, onChange, onDelete }: EventEditorProps) {
  return (
    <div className="entity-card">
      <div className="entity-head two-row">
        <input
          type="date"
          value={entry.date}
          onChange={(event) => onChange({ ...entry, date: event.target.value })}
        />
        <input
          type="color"
          value={entry.color}
          onChange={(event) => onChange({ ...entry, color: event.target.value })}
        />
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
