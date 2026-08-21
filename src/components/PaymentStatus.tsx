import { Link } from "react-router-dom";
import type { PaymentStatus } from "../types";
import { formatMoney } from "../utils/format";

type PaymentStatusProps = {
  status: PaymentStatus | null;
  loading: boolean;
  error: string | null;
};

export function PaymentStatusView({ status, loading, error }: PaymentStatusProps) {
  if (loading && !status) {
    return (
      <div className="rounded-md border border-line bg-white px-5 py-10 text-center">
        <p className="font-medium">Confirming payment…</p>
        <p className="mt-1 text-sm text-muted">
          Waiting for the server to verify the charge.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-line bg-white px-5 py-8">
        <h1 className="text-lg font-semibold">Could not confirm payment</h1>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-accent">
          Back to the leaderboard
        </Link>
      </div>
    );
  }

  if (!status) return null;

  if (status.payment.status === "pending") {
    return (
      <div className="rounded-md border border-line bg-white px-5 py-10 text-center">
        <p className="font-medium">Confirming payment…</p>
        <p className="mt-1 text-sm text-muted">
          Polar webhooks update the bid only after the payment is verified.
        </p>
      </div>
    );
  }

  if (status.payment.status === "failed") {
    return (
      <div className="rounded-md border border-line bg-white px-5 py-8">
        <h1 className="text-lg font-semibold">Payment didn’t go through</h1>
        <p className="mt-2 text-sm text-muted">
          Your bid was not placed and the leaderboard is unchanged.
        </p>
        {status.product ? (
          <Link
            to={`/product/${status.product.id}`}
            className="mt-4 inline-block text-sm font-medium text-accent"
          >
            Try bidding again
          </Link>
        ) : (
          <Link to="/" className="mt-4 inline-block text-sm font-medium text-accent">
            Back to the leaderboard
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line bg-white px-5 py-8">
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        Bid confirmed
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {status.becameNumberOne ? "You’re #1." : "Your bid is live."}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {status.product
          ? `${status.product.name} is now at ${formatMoney(status.product.currentBid)}${
              status.product.rank ? ` · rank #${status.product.rank}` : ""
            }.`
          : `Paid ${formatMoney(status.payment.amount)}.`}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {status.product ? (
          <Link
            to={`/product/${status.product.id}`}
            className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white"
          >
            View product
          </Link>
        ) : null}
        <Link to="/" className="rounded-md border border-line px-3 py-1.5 text-sm">
          See leaderboard
        </Link>
      </div>
    </div>
  );
}
