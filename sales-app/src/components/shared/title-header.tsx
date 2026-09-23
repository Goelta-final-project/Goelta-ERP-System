import type {ReactNode} from "react";
import {Link} from "react-router-dom";

interface PageheaderProps {
    title: string;
    count?: number;
    subtitle?: string;
    actions?: ReactNode;
    crumbs?: { label: string; to: string }[];
}

export default function TitleHeader({
                                        title,
                                        count,
                                        subtitle,
                                        actions,
                                        crumbs,
                                    }: PageheaderProps) {
    return (
        <header className="page-header">
            <div>
                <div className="breadcrumbs">
                    {crumbs?.map((c) => (
                        <span key={c.to}>
              <Link to={c.to}>{c.label}</Link>
                            {/*<Icon name="chevron" size={13}/>*/}
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