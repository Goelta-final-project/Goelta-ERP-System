import { type ReactNode } from "react";

export function StatusBar({
  stages,
  current,
  actions,
}: {
  stages: string[];
  current: string;
  actions?: ReactNode;
}) {
  return (
    <div className="statusbar">
      <div className="actions">{actions}</div>
      <ol className="stages" aria-label="Document status">
        {(stages.includes(current) ? stages : [...stages, current]).map(
          (s, i) => (
            <li
              key={s}
              className={
                s === current
                  ? "current"
                  : i < stages.indexOf(current)
                    ? "completed"
                    : ""
              }
              aria-current={s === current ? "step" : undefined}
            >
              {s}
            </li>
          ),
        )}
      </ol>
    </div>
  );
}
