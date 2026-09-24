import { type ButtonHTMLAttributes } from "react";
import { Icon } from "./Icon";

export function Button({
  children,
  variant = "secondary",
  icon,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: string;
}) {
  return (
    <button type="button" {...props} className={`btn ${variant} ${className}`}>
      {icon && <Icon name={icon} />} {children}
    </button>
  );
}
