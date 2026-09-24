export type Task = { id: string; title: string; completed: boolean };
export const taskStorageKey = "goelta.dashboard-tasks.v1";
export const taskTitleLimit = 200;

export function validTasks(value: unknown): value is Task[] {
  if (!Array.isArray(value)) return false;
  return (
    value.every((task: unknown) => {
      if (!task || typeof task !== "object") return false;
      const item = task as Partial<Task>;
      return (
        typeof item.id === "string" &&
        item.id.length > 0 &&
        typeof item.title === "string" &&
        item.title.trim().length > 0 &&
        item.title.length <= taskTitleLimit &&
        typeof item.completed === "boolean"
      );
    }) && new Set(value.map((task: Task) => task.id)).size === value.length
  );
}
