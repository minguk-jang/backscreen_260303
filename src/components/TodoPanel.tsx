import { useMemo, useState } from "react";
import type { TodoEntry } from "../types";
import { sortTodos } from "../utils/todos";

interface TodoPanelProps {
  todos: TodoEntry[];
  onAddTodo: (text: string) => void;
  onDeleteTodo: (todoId: string) => void;
}

export function TodoPanel({ todos, onAddTodo, onDeleteTodo }: TodoPanelProps) {
  const [text, setText] = useState("");
  const sorted = useMemo(() => sortTodos(todos), [todos]);

  return (
    <section className="panel todo-panel">
      <div className="panel-title-row">
        <h2>Todo 관리</h2>
      </div>
      <p className="helper-text">완료 체크는 바탕화면 위젯에서 할 수 있습니다.</p>

      <div className="todo-add-row">
        <input
          value={text}
          placeholder="할 일을 입력하세요"
          onChange={(event) => setText(event.target.value)}
        />
        <button
          onClick={() => {
            onAddTodo(text);
            setText("");
          }}
        >
          추가
        </button>
      </div>

      <div className="list-body compact">
        {sorted.map((todo) => (
          <div key={todo.id} className="entity-card todo-item-row">
            <span className={todo.done ? "todo-done" : ""}>{todo.text}</span>
            <button className="danger" onClick={() => onDeleteTodo(todo.id)}>
              삭제
            </button>
          </div>
        ))}
        {sorted.length === 0 && <p className="empty">등록된 할 일이 없습니다.</p>}
      </div>
    </section>
  );
}
