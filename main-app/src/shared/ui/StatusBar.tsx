import { type ReactNode } from "react";

export function StatusBar({
  actions,
}: {
  stages: string[];
  current: string;
  actions?: ReactNode;
}) {
  if (!actions) return null;
  return (
    <div className="record-action-bar">
      <div className="actions">{actions}</div>
    </div>
  );
}
