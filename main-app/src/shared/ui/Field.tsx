import { type ReactNode } from "react";

export function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <b className="required"> *</b>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
