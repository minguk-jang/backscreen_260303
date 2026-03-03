import { useState } from "react";
import { weekdayOptions } from "../defaults";
import type { TimetableSlot, Weekday } from "../types";

const weekdayLabel: Record<Weekday, string> = {
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금"
};

interface TimetablePanelProps {
  timetable: Record<Weekday, TimetableSlot[]>;
  onAddSlot: (day: Weekday) => void;
  onUpdateSlot: (day: Weekday, slotId: string, key: keyof TimetableSlot, value: string) => void;
  onDeleteSlot: (day: Weekday, slotId: string) => void;
}

export function TimetablePanel({ timetable, onAddSlot, onUpdateSlot, onDeleteSlot }: TimetablePanelProps) {
  const [selectedDay, setSelectedDay] = useState<Weekday>("mon");
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="panel">
      <div className="panel-title-row">
        <h2>시간표</h2>
        <div className="inline-actions">
          <button onClick={() => setExpanded((prev) => !prev)}>{expanded ? "접기" : "펼치기"}</button>
          {expanded && <button onClick={() => onAddSlot(selectedDay)}>교시 추가</button>}
        </div>
      </div>

      <p className="helper-text">시간표는 학기 시작 시 1회 수정하면 됩니다.</p>

      {!expanded ? null : (
        <>
          <div className="day-tabs">
            {weekdayOptions.map((day) => (
              <button
                key={day.key}
                className={selectedDay === day.key ? "active" : ""}
                onClick={() => setSelectedDay(day.key)}
              >
                {day.label}요일
              </button>
            ))}
          </div>

          <div className="list-body">
            {timetable[selectedDay].map((slot) => (
              <div className="list-row timetable-row" key={slot.id}>
                <input
                  value={slot.periodLabel}
                  onChange={(event) => onUpdateSlot(selectedDay, slot.id, "periodLabel", event.target.value)}
                />
                <input
                  value={slot.subject}
                  onChange={(event) => onUpdateSlot(selectedDay, slot.id, "subject", event.target.value)}
                  placeholder="과목"
                />
                <input
                  type="time"
                  value={slot.start}
                  onChange={(event) => onUpdateSlot(selectedDay, slot.id, "start", event.target.value)}
                />
                <input type="time" value={slot.end} onChange={(event) => onUpdateSlot(selectedDay, slot.id, "end", event.target.value)} />
                <button className="danger" onClick={() => onDeleteSlot(selectedDay, slot.id)}>
                  삭제
                </button>
              </div>
            ))}
            {timetable[selectedDay].length === 0 && <p className="empty">{weekdayLabel[selectedDay]}요일 교시 없음</p>}
          </div>
        </>
      )}
    </section>
  );
}
