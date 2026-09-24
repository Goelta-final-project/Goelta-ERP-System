import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./Icon";

export function PageHeader({
  title,
  count,
  subtitle,
  actions,
  crumbs,
}: {
  title: string;
  count?: number;
  subtitle?: string;
  actions?: ReactNode;
  crumbs?: { label: string; to: string }[];
}) {
  return (
    <header className="page-header">
      <div>
        <div className="breadcrumbs">
          {crumbs?.map((c) => (
            <span key={c.to}>
              <Link to={c.to}>{c.label}</Link>
              <Icon name="chevron" size={13} />
            </span>
          ))}
        </div>
        <div className="heading-line">
          <h1>{title}</h1>
          {count !== undefined && <span className="count">{count}</span>}
        </div>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="actions">{actions}</div>
    </header>
  );
}
