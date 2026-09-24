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
