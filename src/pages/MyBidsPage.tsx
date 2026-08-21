import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { AuthModal } from "../components/AuthModal";
import { ProductLogo } from "../components/ProductLogo";
import { useAuth } from "../hooks/useAuth";
import type { UserBid } from "../types";
import { formatMoney, formatTimeAgo } from "../utils/format";

export function MyBidsPage() {
  const { user } = useAuth();
  const [bids, setBids] = useState<UserBid[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api
      .myBids()
      .then((data) => setBids(data.bids))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load bids.");
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-lg rounded-md border border-line bg-white px-5 py-10 text-center">
        <h1 className="text-xl font-semibold tracking-tight">My bids</h1>
        <p className="mt-2 text-sm text-muted">Sign in to see products you’ve bid on.</p>
        <button type="button" onClick={() => setAuthOpen(true)} className="btn-primary mt-4">
          Log in
        </button>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">My bids</h1>
      <p className="mt-2 text-sm text-muted">
        Only confirmed payments appear as live bids on the leaderboard.
      </p>

      <div className="mt-6">
        {loading ? (
          <div className="h-40 animate-pulse rounded-md border border-line bg-white" />
        ) : error ? (
          <p className="text-sm text-accent">{error}</p>
        ) : bids.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-muted">
            You haven’t placed a bid yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {bids.map((bid) => (
              <li
                key={bid.id}
                className="flex items-center gap-3 rounded-md border border-line bg-white px-4 py-3"
              >
                <ProductLogo src={bid.product.logoUrl} name={bid.product.name} />
                <div className="min-w-0 flex-1">
                  <Link to={`/product/${bid.product.id}`} className="font-medium hover:underline">
                    {bid.product.name}
                  </Link>
                  <div className="text-xs text-muted">
                    {formatTimeAgo(bid.confirmedAt || bid.createdAt)}
                    {bid.product.rank ? ` · now #${bid.product.rank}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">
                    {formatMoney(bid.amount)}
                  </div>
                  <div
                    className={`text-xs ${
                      bid.status === "succeeded"
                        ? "text-emerald-600"
                        : bid.status === "failed"
                          ? "text-accent"
                          : "text-muted"
                    }`}
                  >
                    {bid.status}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
