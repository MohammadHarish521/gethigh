import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: "products" | "bids" | "search";
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  icon = "products",
  action,
}: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">
        {icon === "search" ? <SearchIcon /> : icon === "bids" ? <BidIcon /> : <BoxIcon />}
      </div>
      <h3 className="text-[17px] font-semibold tracking-[-0.4px] text-fg-strong">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-[1.4] font-medium tracking-[-0.3px] text-muted">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function BoxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3.5 6.5L10 3l6.5 3.5M3.5 6.5L10 10m-6.5-3.5V13.5L10 17m0-7l6.5-3.5M10 10v7m6.5-10.5V13.5L10 17"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BidIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 4v12M10 4L6 8M10 4l4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
