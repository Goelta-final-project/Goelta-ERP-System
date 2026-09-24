import {
    useEffect,
    useId,
    useRef,
    useState,
    type ButtonHTMLAttributes,
    type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import type { Event, Line } from "../../types/model";
import { money, totals } from "../../types/domain";

const paths: Record<string, ReactNode> = {
    grid: (
        <>
            <rect x="3" y="3" width="6" height="6" rx="1" />
            <rect x="15" y="3" width="6" height="6" rx="1" />
            <rect x="3" y="15" width="6" height="6" rx="1" />
            <rect x="15" y="15" width="6" height="6" rx="1" />
        </>
    ),
    search: (
        <>
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 5 5" />
        </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    down: <path d="m6 9 6 6 6-6" />,
    file: (
        <>
            <path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h6" />
        </>
    ),
    users: (
        <>
            <circle cx="9" cy="8" r="3" />
            <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M17 15a5 5 0 0 1 4 5" />
        </>
    ),
    box: (
        <>
            <path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9M7 5l9 5" />
        </>
    ),
    download: (
        <>
            <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
        </>
    ),
    upload: (
        <>
            <path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" />
        </>
    ),
    trash: (
        <>
            <path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" />
        </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    mail: (
        <>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 6 9 7 9-7" />
        </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
    filter: <path d="M3 5h18M6 12h12M9 19h6" />,
    dollar: (
        <>
            <path d="M12 2v20M18 6H9a4 4 0 0 0 0 8h6a4 4 0 0 1 0 8H5" />
        </>
    ),
    up: <path d="m6 15 6-6 6 6" />,
    copy: (
        <>
            <rect x="8" y="8" width="12" height="13" rx="2" />
            <path d="M16 8V3H3v13h5" />
        </>
    ),
    settings: (
        <>
            <path d="M4 7h16M4 17h16" />
            <circle cx="8" cy="7" r="3" />
            <circle cx="16" cy="17" r="3" />
        </>
    ),
};
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {paths[name] || paths.file}
        </svg>
    );
}
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
export function Badge({ status }: { status: string }) {
    const tone = [
        "Accepted",
        "Sales Order",
        "Paid",
        "Received",
        "Active",
        "Invoiced",
    ].includes(status)
        ? "green"
        : [
            "Sent",
            "Posted",
            "Purchase Order",
            "RFQ Sent",
            "Partially paid",
        ].includes(status)
            ? "blue"
            : ["Hold", "To invoice", "Down payment", "Draft invoice"].includes(status)
                ? "amber"
                : ["Rejected", "Cancelled", "Inactive"].includes(status)
                    ? "muted"
                    : "purple";
    return (
        <span className={`badge ${tone}`}>
      <i />
            {status === "Accepted" ? "Sales Order" : status}
    </span>
    );
}
export function Empty({
                          title,
                          description,
                          action,
                      }: {
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className="empty">
            <div className="empty-icon">
                <Icon name="file" size={30} />
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
            {action}
        </div>
    );
}

export function Modal({
                          title,
                          children,
                          onClose,
                          footer,
                          wide = false,
                      }: {
    title: string;
    children: ReactNode;
    onClose: () => void;
    footer?: ReactNode;
    wide?: boolean;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const id = useId();
    useEffect(() => {
        ref.current?.showModal();
    }, []);
    return (
        <dialog
            ref={ref}
            className={wide ? "modal wide" : "modal"}
            aria-labelledby={id}
            onCancel={(e) => {
                e.preventDefault();
                onClose();
            }}
        >
            <div className="modal-head">
                <h2 id={id}>{title}</h2>
                <Button variant="ghost" aria-label="Close dialog" onClick={onClose}>
                    <Icon name="close" />
                </Button>
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-foot">{footer}</div>}
        </dialog>
    );
}
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
export function Tabs({
                         tabs,
                         value,
                         onChange,
                     }: {
    tabs: { id: string; label: string; count?: number }[];
    value: string;
    onChange: (id: string) => void;
}) {
    return (
        <div className="tabs" role="tablist">
            {tabs.map((t) => (
                <button
                    type="button"
                    role="tab"
                    aria-selected={value === t.id}
                    key={t.id}
                    className={value === t.id ? "active" : ""}
                    onClick={() => onChange(t.id)}
                >
                    {t.label}
                    {t.count !== undefined && <span>{t.count}</span>}
                </button>
            ))}
        </div>
    );
}
export function Totals({
                           lines,
                           discount = 0,
                           taxRate = 0,
                           deduction = 0,
                           deductionTax = 0,
                           onDiscount,
                           onTax,
                       }: {
    lines: Line[];
    discount?: number;
    taxRate?: number;
    deduction?: number;
    deductionTax?: number;
    onDiscount?: (n: number) => void;
    onTax?: (n: number) => void;
}) {
    let result;
    try {
        result = totals(lines, discount, taxRate);
    } catch (e) {
        return <div className="alert error">{(e as Error).message}</div>;
    }
    return (
        <div className="totals">
            <div>
                <span>Untaxed amount</span>
                <strong>{money(result.subtotal)}</strong>
            </div>
            <div>
                <span>Discount{onDiscount && " ($)"}</span>
                {onDiscount ? (
                    <input
                        aria-label="Discount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={discount}
                        onChange={(e) => onDiscount(e.target.valueAsNumber)}
                    />
                ) : (
                    <strong>{money(discount)}</strong>
                )}
            </div>
            {deduction > 0 && (
                <div>
                    <span>Down payments (excl. tax)</span>
                    <strong>−{money(deduction - deductionTax)}</strong>
                </div>
            )}
            <div>
        <span>
          Tax{" "}
            {onTax ? (
                <label>
                    <input
                        aria-label="Tax percent"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={taxRate}
                        onChange={(e) => onTax(e.target.valueAsNumber)}
                    />
                    %
                </label>
            ) : (
                `(${taxRate}%)`
            )}
        </span>
                <strong>{money(result.tax - deductionTax)}</strong>
            </div>
            <div className="grand-total">
                <span>Total</span>
                <strong>{money(result.total - deduction)}</strong>
            </div>
        </div>
    );
}
export function Activity({
                             events,
                             onNote,
                         }: {
    events: Event[];
    onNote?: (message: string) => boolean;
}) {
    const [note, setNote] = useState("");
    return (
        <aside className="activity">
            <h3>
                <Icon name="clock" />
                Activity
            </h3>
            {onNote && (
                <div className="activity-compose">
          <textarea
              aria-label="Internal note"
              placeholder="Log an internal note…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
          />
                    <Button
                        variant="ghost"
                        disabled={!note.trim()}
                        onClick={() => {
                            if (onNote(note.trim())) setNote("");
                        }}
                    >
                        Log note
                    </Button>
                </div>
            )}
            <div className="timeline">
                {[...events].reverse().map((e) => (
                    <div className="timeline-event" key={e.id}>
                        <div className="timeline-dot" />
                        <div>
                            <p>{e.message}</p>
                            <time dateTime={e.date}>
                                {new Date(e.date).toLocaleString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </time>
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}
export function Search({
                           value,
                           onChange,
                           placeholder,
                       }: {
    value: string;
    onChange: (s: string) => void;
    placeholder: string;
}) {
    return (
        <div className="search">
            <Icon name="search" />
            <input
                aria-label={placeholder}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            {value && (
                <button aria-label="Clear search" onClick={() => onChange("")}>
                    <Icon name="close" size={15} />
                </button>
            )}
        </div>
    );
}
export function Pagination({
                               count,
                               page,
                               onChange,
                               size = 12,
                           }: {
    count: number;
    page: number;
    onChange: (n: number) => void;
    size?: number;
}) {
    const end = Math.min((page + 1) * size, count);
    return (
        <div className="pagination">
      <span>
        {count ? page * size + 1 : 0}–{end} of {count}
      </span>
            <button
                aria-label="Previous page"
                disabled={page === 0}
                onClick={() => onChange(page - 1)}
            >
                ‹
            </button>
            <button
                aria-label="Next page"
                disabled={end >= count}
                onClick={() => onChange(page + 1)}
            >
                ›
            </button>
        </div>
    );
}