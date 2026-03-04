import type { AppState, Weekday } from "../types";

export interface ValidationIssue {
  path: string;
  message: string;
  fix: string;
}

const dayLabel: Record<Weekday, string> = {
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금"
};

function toMinute(text: string): number | null {
  const [h, m] = text.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return null;
  }
  return h * 60 + m;
}

export function validateState(state: AppState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (
    !Number.isFinite(state.display.contentScalePercent) ||
    state.display.contentScalePercent < 50 ||
    state.display.contentScalePercent > 130
  ) {
    issues.push({
      path: "display.contentScalePercent",
      message: "콘텐츠 크기(%)는 50~130 범위여야 합니다.",
      fix: "디스플레이 설정에서 콘텐츠 크기를 50~130 사이로 조정해 주세요."
    });
  }

  if (
    !Number.isFinite(state.display.offsetXPercent) ||
    !Number.isFinite(state.display.offsetYPercent)
  ) {
    issues.push({
      path: "display.offset",
      message: "콘텐츠 위치 값이 올바르지 않습니다.",
      fix: "위치 초기화를 눌러 가운데 정렬로 복원해 주세요."
    });
  }

  for (const todo of state.todos) {
    if (!todo.text.trim()) {
      issues.push({
        path: `todos.${todo.id}.text`,
        message: "할 일 텍스트가 비어 있습니다.",
        fix: "할 일 내용을 입력해 주세요."
      });
      break;
    }

    if (todo.text.length > 120) {
      issues.push({
        path: `todos.${todo.id}.text`,
        message: "할 일 텍스트가 너무 깁니다.",
        fix: "120자 이내로 줄여 주세요."
      });
      break;
    }
  }

  for (const day of ["mon", "tue", "wed", "thu", "fri"] as Weekday[]) {
    const slots = [...state.timetable[day]].sort((a, b) => {
      const aMinute = toMinute(a.start) ?? 0;
      const bMinute = toMinute(b.start) ?? 0;
      return aMinute - bMinute;
    });

    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
      if (!slot.subject.trim()) {
        issues.push({
          path: `timetable.${day}.${slot.id}.subject`,
          message: `${dayLabel[day]}요일 ${slot.periodLabel} 과목명이 비어 있습니다.`,
          fix: "과목명을 입력해 주세요."
        });
      }

      const start = toMinute(slot.start);
      const end = toMinute(slot.end);
      if (start === null || end === null || start > end) {
        issues.push({
          path: `timetable.${day}.${slot.id}.time`,
          message: `${dayLabel[day]}요일 ${slot.periodLabel} 시간 형식이 잘못되었습니다.`,
          fix: "시작 시간과 종료 시간을 다시 확인해 주세요."
        });
      }

      if (i > 0) {
        const prevEnd = toMinute(slots[i - 1].end);
        if (start !== null && prevEnd !== null && start < prevEnd) {
          issues.push({
            path: `timetable.${day}`,
            message: `${dayLabel[day]}요일 교시 시간이 겹칩니다.`,
            fix: "겹치는 교시 시간 구간을 조정해 주세요."
          });
        }
      }
    }
  }

  for (const meal of state.meals) {
    if (!meal.date) {
      issues.push({
        path: `meals.${meal.id}.date`,
        message: "급식 날짜가 비어 있습니다.",
        fix: "급식 항목의 날짜를 입력해 주세요."
      });
      break;
    }
  }

  for (const event of state.events) {
    if (!event.date || !event.title.trim()) {
      issues.push({
        path: `events.${event.id}`,
        message: "일정 제목이 비어 있습니다.",
        fix: "일정 제목을 입력해 주세요."
      });
      break;
    }
  }

  return issues;
}
