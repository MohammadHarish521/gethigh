import type { BidHistoryItem } from "../types";
import { formatMoney, formatTimeAgo } from "../utils/format";

export function BidHistory({ bids }: { bids: BidHistoryItem[] }) {
  if (bids.length === 0) {
    return <p className="card px-5 py-8 text-center text-sm text-muted">No confirmed bids yet.</p>;
  }

  const climbBids = bids.filter((bid) => bid.kind !== "dump");
  const leadingAmount = climbBids.length ? Math.max(...climbBids.map((bid) => bid.amount)) : null;

  return (
    <ol className="card divide-y divide-border/70 overflow-hidden">
      {bids.map((bid) => (
        <li key={bid.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-fg-strong">{bid.userName}</div>
            <div className="text-xs tracking-[-0.2px] text-muted">{formatTimeAgo(bid.createdAt)}</div>
          </div>
          <div className="text-right">
            <div
              className={`num text-sm font-bold ${
                bid.kind === "dump" ? "text-fire-deep" : "text-accent"
              }`}
            >
              {formatMoney(bid.amount)}
            </div>
            {bid.kind === "dump" ? (
              <div className="text-xs font-medium text-fire-deep">Dumped</div>
            ) : leadingAmount !== null && bid.amount === leadingAmount ? (
              <div className="text-xs font-medium text-green">Leading</div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
