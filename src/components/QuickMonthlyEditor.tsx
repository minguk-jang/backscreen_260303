import { useMemo, useState } from "react";
import type { EventEntry, MealEntry } from "../types";

interface QuickMonthlyEditorProps {
  monthKey: string;
  meals: MealEntry[];
  events: EventEntry[];
  onQuickAddEvent: (date: string, title: string) => void;
  onQuickAddMeal: (date: string, itemsText: string) => void;
}

export function QuickMonthlyEditor({
  monthKey,
  meals,
  events,
  onQuickAddEvent,
  onQuickAddMeal
}: QuickMonthlyEditorProps) {
  const [eventDate, setEventDate] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [mealDate, setMealDate] = useState("");
  const [mealItems, setMealItems] = useState("");

  const mealSummary = useMemo(() => meals.slice(0, 3), [meals]);
  const eventSummary = useMemo(() => events.slice(0, 3), [events]);

  return (
    <section className="quick-monthly-editor panel" aria-label="이번 달 빠른 수정">
      <div className="panel-title-row">
        <h2>이번 달 빠른 수정</h2>
        <span>{monthKey}</span>
      </div>

      <div className="field-grid two-col">
        <label>
          일정 날짜
          <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
        </label>
        <label>
          일정 제목
          <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} />
        </label>
      </div>
      <button
        onClick={() => {
          onQuickAddEvent(eventDate, eventTitle);
          setEventTitle("");
        }}
      >
        일정 빠른 추가
      </button>

      <div className="field-grid two-col">
        <label>
          급식 날짜
          <input type="date" value={mealDate} onChange={(event) => setMealDate(event.target.value)} />
        </label>
        <label>
          급식 메뉴
          <textarea
            rows={3}
            value={mealItems}
            onChange={(event) => setMealItems(event.target.value)}
            placeholder="한 줄에 메뉴 하나씩 입력"
          />
        </label>
      </div>
      <button
        onClick={() => {
          onQuickAddMeal(mealDate, mealItems);
          setMealItems("");
        }}
      >
        급식 빠른 추가
      </button>

      <p>{`이번 달 일정 ${events.length}건 / 급식 ${meals.length}건`}</p>

      <div className="field-grid two-col">
        <div>
          <strong>최근 일정</strong>
          {eventSummary.map((entry) => (
            <p key={entry.id}>{`${entry.date} ${entry.title}`}</p>
          ))}
          {eventSummary.length === 0 && <p>이번 달 일정 없음</p>}
        </div>
        <div>
          <strong>최근 급식</strong>
          {mealSummary.map((entry) => (
            <p key={entry.id}>{`${entry.date} (${entry.items.length}개 메뉴)`}</p>
          ))}
          {mealSummary.length === 0 && <p>이번 달 급식 없음</p>}
        </div>
      </div>
    </section>
  );
}
