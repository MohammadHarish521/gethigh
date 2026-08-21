import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Product } from "../types";
import { formatMoney } from "../utils/format";
import { Modal } from "./Modal";
import { ProductLogo } from "./ProductLogo";

type BidModalProps = {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
};

export function BidModal({ product, open, onClose, onConfirm }: BidModalProps) {
  const [amount, setAmount] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product && open) {
      setAmount(String(product.minNextBid));
      window.setTimeout(() => inputRef.current?.select(), 40);
    }
  }, [product, open]);

  if (!product) return null;

  const bidAmount = Number(amount);
  const tooLow = !Number.isInteger(bidAmount) || bidAmount < product.minNextBid;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (tooLow) return;
    onConfirm(bidAmount);
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="bid-title">
      <div className="flex items-start gap-3">
        <ProductLogo src={product.logoUrl} name={product.name} />
        <div className="min-w-0">
          <h2 id="bid-title" className="truncate text-lg font-semibold tracking-tight">
            {product.name}
          </h2>
          <p className="mt-0.5 text-sm text-muted">Place a bid to move up the board.</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="text-xs font-medium uppercase tracking-wide text-muted">Current bid</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
          {formatMoney(product.currentBid)}
        </div>
      </div>

      <form className="mt-6" onSubmit={onSubmit}>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Your bid</span>
          <div className="mt-2 flex items-baseline gap-1 border-b border-line pb-2 focus-within:border-neutral-400">
            <span className="text-3xl font-semibold text-faint">$</span>
            <input
              ref={inputRef}
              required
              type="number"
              min={product.minNextBid}
              step={1}
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full bg-transparent text-3xl font-semibold tabular-nums tracking-tight outline-none"
            />
          </div>
        </label>

        <p className="mt-2 text-sm text-muted">Minimum bid: {formatMoney(product.minNextBid)}</p>

        {tooLow && amount !== "" ? (
          <p className="mt-2 text-sm text-accent">
            Enter at least {formatMoney(product.minNextBid)}.
          </p>
        ) : null}

        <button type="submit" disabled={tooLow} className="btn-primary mt-6 w-full">
          Continue
        </button>
      </form>
    </Modal>
  );
}
