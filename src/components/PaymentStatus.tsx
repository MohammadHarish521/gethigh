import { useState } from "react";
import { Link } from "react-router-dom";
import type { PaymentStatus } from "../types";
import { formatHeld, formatMoney } from "../utils/format";

type PaymentStatusProps = {
  status: PaymentStatus | null;
  loading: boolean;
  error: string | null;
};

export function PaymentStatusView({
  status,
  loading,
  error,
}: PaymentStatusProps) {
  const [copied, setCopied] = useState(false);

  if (loading && !status) {
    return (
      <div className="card px-5 py-12 text-center">
        <p className="font-semibold text-fg-strong">Confirming payment…</p>
        <p className="mt-1 text-sm text-muted">
          Waiting for the charge to land.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card px-5 py-8">
        <h1 className="font-display text-2xl font-extrabold tracking-[-0.06em]">
          Could not confirm payment
        </h1>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm font-semibold text-accent hover:underline"
        >
          Back to the leaderboard
        </Link>
      </div>
    );
  }

  if (!status) return null;

  if (status.payment.status === "pending") {
    return (
      <div className="card px-5 py-12 text-center">
        <p className="font-semibold text-fg-strong">Confirming payment…</p>
        <p className="mt-1 text-sm text-muted">
          Polar webhooks update the board only after the payment is verified.
        </p>
      </div>
    );
  }

  if (status.payment.status === "failed") {
    return (
      <div className="card px-5 py-8">
        <h1 className="font-display text-2xl font-extrabold tracking-[-0.06em]">
          Payment didn’t go through
        </h1>
        <p className="mt-2 text-sm text-muted">
          Nothing changed on the leaderboard.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm font-semibold text-accent hover:underline"
        >
          Back to the leaderboard
        </Link>
      </div>
    );
  }

  const isDump = status.bid?.kind === "dump";

  if (isDump) {
    const name = status.product?.name ?? "them";
    const rank = status.bid?.dumpRank;
    const missed = rank == null;
    const held = formatHeld(status.bid?.dumpHeldSeconds);
    const share = `I paid ${formatMoney(status.payment.amount)} to dump ${name}${
      rank ? ` from #${rank}` : ""
    } after ${held}.`;

    if (missed) {
      return (
        <div className="card px-6 py-10 text-center">
          <p className="mx-auto inline-flex rounded-full bg-orange-soft px-2.5 py-1 text-[15px] font-medium tracking-[-0.3px] text-fire-deep">
            Hit missed
          </p>
          <h1 className="font-display mt-4 text-[44px] leading-[0.98] font-extrabold tracking-[-0.06em]">
            {name}
          </h1>
          <p className="mt-2 text-sm font-medium tracking-[-0.3px] text-muted">
            Paid {formatMoney(status.payment.amount)}, but they’d already moved.
            Dump only lands if the price is still what you paid.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-ghost">
              See leaderboard
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="card px-6 py-10 text-center">
        <p className="mx-auto inline-flex rounded-full bg-orange-soft px-2.5 py-1 text-[15px] font-medium tracking-[-0.3px] text-fire-deep">
          Dumped
        </p>
        <h1 className="font-display mt-4 text-[44px] leading-[0.98] font-extrabold tracking-[-0.06em]">
          {name}
        </h1>
        <p className="mt-2 text-sm font-medium tracking-[-0.3px] text-muted">
          Paid {formatMoney(status.payment.amount)}
          {rank ? ` to knock them from #${rank}` : ""} after {held}.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            className="btn-fire"
            onClick={async () => {
              await navigator.clipboard.writeText(share);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy kill card"}
          </button>
          <Link to="/" className="btn-ghost">
            See leaderboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card px-6 py-8 text-center sm:px-10">
      <p className="chip-live mx-auto">Bid confirmed</p>
      <h1 className="font-display mt-4 text-[44px] leading-[0.98] font-extrabold tracking-[-0.06em]">
        {status.becameNumberOne ? "You’re #1." : "Your bid is live."}
      </h1>
      <p className="mt-2 text-sm font-medium tracking-[-0.3px] text-muted">
        {status.product
          ? `${status.product.name} is now at ${formatMoney(status.product.currentBid)}${
              status.product.rank ? ` · rank #${status.product.rank}` : ""
            }.`
          : `Paid ${formatMoney(status.payment.amount)}.`}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {status.product ? (
          <Link to={`/product/${status.product.id}`} className="btn-primary">
            View product
          </Link>
        ) : null}
        <Link to="/" className="btn-ghost">
          See leaderboard
        </Link>
      </div>
    </div>
  );
}
