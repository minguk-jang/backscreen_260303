import type { MealEntry } from "../../types";

interface MealEditorProps {
  meal: MealEntry;
  onChange: (entry: MealEntry) => void;
  onDelete: () => void;
}

export function MealEditor({ meal, onChange, onDelete }: MealEditorProps) {
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
