import { type ReactNode } from "react";

export function StatusBar({
  actions,
}: {
  stages: string[];
  current: string;
  actions?: ReactNode;
}) {
  // Stage menus were intentionally removed; callers still use this component
  // as the shared, compact location for workflow actions.
  if (!actions) return null;
  return (
    <div className="record-action-bar">
      <div className="actions">{actions}</div>
    </div>
  );
}
