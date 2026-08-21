import type { BidHistoryItem } from "../types";
import { formatMoney, formatTimeAgo } from "../utils/format";
import { EmptyState } from "./EmptyState";

export function BidHistory({ bids }: { bids: BidHistoryItem[] }) {
  if (bids.length === 0) {
    return (
      <EmptyState
        icon="bids"
        title="No bids yet"
        description="Be the first to bid and take this product’s spot on the board."
      />
    );
  }

  const leadingAmount = Math.max(...bids.map((bid) => bid.amount));

  return (
    <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
      {bids.map((bid) => (
        <li key={bid.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{bid.userName}</div>
            <div className="text-xs text-muted">{formatTimeAgo(bid.createdAt)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold tabular-nums">{formatMoney(bid.amount)}</div>
            {bid.amount === leadingAmount ? (
              <div className="text-xs text-accent">Leading</div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
