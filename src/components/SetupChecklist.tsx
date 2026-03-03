import type { ChecklistItem } from "../utils/checklist";

interface SetupChecklistProps {
  items: ChecklistItem[];
  completed: number;
  total: number;
}

export function SetupChecklist({ items, completed, total }: SetupChecklistProps) {
  return (
    <section className="setup-checklist" aria-label="초기 설정 체크리스트">
      <strong>{`진행률 ${completed}/${total}`}</strong>
      <ul>
        {items.map((item) => (
          <li key={item.key} data-done={item.done}>
            {item.done ? "완료" : "미완료"} {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
