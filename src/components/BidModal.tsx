import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Product } from "../types";
import { formatMoney } from "../utils/format";
import { Modal } from "./Modal";
import { ProductLogo } from "./ProductLogo";

type BidModalProps = {
  product: Product | null;
  open: boolean;
  onClose: () => void;
};

export function BidModal({ product, open, onClose }: BidModalProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product && open) {
      setAmount(String(product.minNextBid));
      setError(null);
      setLoading(false);
      window.setTimeout(() => inputRef.current?.select(), 40);
    }
  }, [product, open]);

  if (!product) return null;

  const bidAmount = Number(amount);
  const tooLow = !Number.isInteger(bidAmount) || bidAmount < product.minNextBid;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!product || tooLow) return;
    setError(null);
    setLoading(true);
    try {
      const checkout = await api.createBid(product.id, bidAmount);
      window.location.href = checkout.checkoutUrl;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="bid-title">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ProductLogo src={product.logoUrl} name={product.name} siteUrl={product.url} />
          <div className="min-w-0">
            <h2 id="bid-title" className="truncate text-lg font-semibold">
              Bid on {product.name}
            </h2>
            <p className="text-sm text-muted">Highest confirmed bid takes the more visible spot.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-muted hover:bg-neutral-100"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md border border-line bg-page px-3 py-2">
          <div className="text-xs text-muted">Current highest bid</div>
          <div className="mt-0.5 font-semibold tabular-nums">{formatMoney(product.currentBid)}</div>
        </div>
        <div className="rounded-md border border-line bg-page px-3 py-2">
          <div className="text-xs text-muted">Minimum next bid</div>
          <div className="mt-0.5 font-semibold tabular-nums">{formatMoney(product.minNextBid)}</div>
        </div>
      </div>

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Your bid (USD)</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              $
            </span>
            <input
              ref={inputRef}
              required
              type="number"
              min={product.minNextBid}
              step={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="input pl-7"
            />
          </div>
        </label>
        {tooLow && amount !== "" ? (
          <p className="text-sm text-danger">Enter at least {formatMoney(product.minNextBid)}.</p>
        ) : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button type="submit" disabled={loading || tooLow} className="btn-primary w-full">
          {loading
            ? "Starting checkout…"
            : `Pay ${Number.isInteger(bidAmount) ? formatMoney(bidAmount) : ""}`}
        </button>
        <p className="text-center text-xs text-muted">
          Every bid is charged in full, and your spot bleeds 5% a day. The
          leaderboard updates only after payment is confirmed on the server.
        </p>
      </form>
    </Modal>
  );
}
