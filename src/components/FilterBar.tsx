import type { SortKey } from "../types";

type FilterBarProps = {
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  query: string;
  onQuery: (query: string) => void;
};

const filters: Array<{ id: SortKey; label: string }> = [
  { id: "trending", label: "Trending" },
  { id: "highest", label: "Highest Bid" },
  { id: "newest", label: "Newest" },
];

export function FilterBar({ sort, onSort, query, onQuery }: FilterBarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
        {filters.map((filter) => {
          const active = sort === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onSort(filter.id)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-white font-medium text-ink shadow-[var(--shadow-card)]"
                  : "text-muted hover:text-ink"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <label className="relative block sm:w-56">
        <span className="sr-only">Search products</span>
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M9.2 9.2L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search products"
          className="input h-9 pl-8"
        />
      </label>
    </div>
  );
}
