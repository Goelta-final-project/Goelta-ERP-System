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
