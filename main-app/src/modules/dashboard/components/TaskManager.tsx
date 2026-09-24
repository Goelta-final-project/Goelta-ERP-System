import { useState, type FormEvent } from "react";
import { usePersistentState } from "../../../shared/hooks/usePersistentState";
import { Icon } from "../../../shared/ui/Icon";
import {
  taskStorageKey,
  taskTitleLimit,
  validTasks,
  type Task,
} from "../data/tasks";

export function TaskManager() {
  const {
    value: tasks,
    commit,
    error,
  } = usePersistentState<Task[]>(taskStorageKey, [], validTasks);
  const [title, setTitle] = useState("");
  const pending = tasks.filter((task) => !task.completed).length;

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    if (
      commit((current) => [
        ...current,
        { id: crypto.randomUUID(), title: value, completed: false },
      ])
    )
      setTitle("");
  }

  return (
    <section
      className="dashboard-panel task-panel"
      aria-labelledby="tasks-heading"
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Stay on track</span>
          <h2 id="tasks-heading">To-do manager</h2>
        </div>
        <span className="pending-count" aria-live="polite">
          {pending} pending
        </span>
      </div>
      <form className="task-form" onSubmit={addTask}>
        <input
          aria-label="New task"
          placeholder="What needs to get done?"
          maxLength={taskTitleLimit}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button
          type="submit"
          className="btn primary"
          disabled={!title.trim()}
          aria-label="Add task"
        >
          <Icon name="plus" size={18} />
        </button>
      </form>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      {tasks.length ? (
        <ul className="dashboard-tasks">
          {tasks.map((task) => (
            <li key={task.id} className={task.completed ? "completed" : ""}>
              <label>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() =>
                    commit((current) =>
                      current.map((item) =>
                        item.id === task.id
                          ? { ...item, completed: !item.completed }
                          : item,
                      ),
                    )
                  }
                />
                <span>{task.title}</span>
              </label>
              <button
                type="button"
                aria-label={`Delete task: ${task.title}`}
                onClick={() =>
                  commit((current) =>
                    current.filter((item) => item.id !== task.id),
                  )
                }
              >
                <Icon name="trash" size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="task-empty">
          <span>
            <Icon name="check" size={23} />
          </span>
          <h3>A little space to plan ahead.</h3>
          <p>Add your first task and keep the next step in sight.</p>
        </div>
      )}
      <p className="panel-footnote">Personal tasks · saved in this browser</p>
    </section>
  );
}
