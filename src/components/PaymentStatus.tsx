import { useState } from "react";
import { Link } from "react-router-dom";
import type { PaymentStatus } from "../types";
import { boardHomePath } from "../lib/constants";
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
          Waiting for the charge to land on the board.
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

  const boardHref = boardHomePath(
    status.claimProduct?.board ?? status.product?.board,
  );

  const isDump = status.bid?.kind === "dump";
  const isSponsor = status.bid?.kind === "sponsor";
  const isBike = status.bid?.kind === "bike";

  if (isBike) {
    return (
      <div className="card px-6 py-10 text-center">
        <p className="chip-live mx-auto">On the NS400Z</p>
        <h1 className="font-display mt-4 text-[44px] leading-[0.98] font-extrabold tracking-[-0.06em]">
          Your logo rides.
        </h1>
        <p className="mt-2 text-sm font-medium tracking-[-0.3px] text-muted">
          Paid {formatMoney(status.payment.amount)}. Vinyl goes on the tank
          within 7 days — until someone pays more.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/bike" className="btn-primary">
            See the tank
          </Link>
        </div>
      </div>
    );
  }

  if (isSponsor) {
    return (
      <div className="card px-6 py-10 text-center">
        <p className="chip-live mx-auto">Sponsor seat taken</p>
        <h1 className="font-display mt-4 text-[44px] leading-[0.98] font-extrabold tracking-[-0.06em]">
          You’re on the wall.
        </h1>
        <p className="mt-2 text-sm font-medium tracking-[-0.3px] text-muted">
          Paid {formatMoney(status.payment.amount)} one time. Your logo stays
          in that seat — no decay, no dump.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to={boardHref} className="btn-primary">
            See the board
          </Link>
        </div>
      </div>
    );
  }

  if (isDump) {
    const name = status.product?.name ?? "them";
    const rank = status.bid?.dumpRank;
    const missed = rank == null;
    const held = formatHeld(status.bid?.dumpHeldSeconds);
    const claim = status.claimProduct;
    const share = `I paid ${formatMoney(status.payment.amount)} to dump ${name}${
      rank ? ` from #${rank}` : ""
    } after ${held}${claim ? ` and took the spot with ${claim.name}` : ""}.`;

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
            <Link to={boardHref} className="btn-ghost">
              See leaderboard
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="card px-6 py-10 text-center">
        <p className="mx-auto inline-flex rounded-full bg-orange-soft px-2.5 py-1 text-[15px] font-medium tracking-[-0.3px] text-fire-deep">
          {status.becameNumberOne ? "You took the spot" : "Dumped"}
        </p>
        <h1 className="font-display mt-4 text-[44px] leading-[0.98] font-extrabold tracking-[-0.06em]">
          {status.claimProduct?.name ?? name}
        </h1>
        <p className="mt-2 text-sm font-medium tracking-[-0.3px] text-muted">
          Paid {formatMoney(status.payment.amount)} to dump {name}
          {rank ? ` from #${rank}` : ""} after {held}
          {status.claimProduct?.rank
            ? `. You’re #${status.claimProduct.rank}.`
            : "."}
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
          <Link to={boardHref} className="btn-ghost">
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
        <Link to={boardHref} className="btn-ghost">
          See leaderboard
        </Link>
      </div>
    </div>
  );
}
