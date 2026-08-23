import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Product } from "../types";
import { formatMoney } from "../utils/format";
import { Modal } from "./Modal";
import { ProductLogo } from "./ProductLogo";

type DumpSpotModalProps = {
  product: Product | null;
  open: boolean;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (url: string) => Promise<void> | void;
};

export function DumpSpotModal({
  product,
  open,
  busy,
  error,
  onClose,
  onSubmit,
}: DumpSpotModalProps) {
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product && open) {
      setUrl("");
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [product, open]);

  if (!product) return null;

  const cost = product.dumpCost ?? product.currentBid;
  const rank = product.rank;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!url.trim() || busy) return;
    await onSubmit(url.trim());
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="dump-spot-title">
      <div className="flex items-start gap-3">
        <ProductLogo
          src={product.logoUrl}
          name={product.name}
          siteUrl={product.url}
          size="sm"
        />
        <div className="min-w-0">
          <h2
            id="dump-spot-title"
            className="text-[20px] font-semibold tracking-[-0.04em] text-fg-strong"
          >
            Take this spot
          </h2>
          <p className="mt-1 text-[14px] leading-[1.4] font-medium tracking-[-0.02em] text-muted">
            Dump {product.name}
            {rank ? ` from #${rank}` : ""}. They hit $0 and last. Your URL sits
            here at {formatMoney(cost)}.
          </p>
        </div>
      </div>

      <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
        <label className="block text-sm">
          <span className="mb-1 block text-[13px] font-medium tracking-[-0.02em] text-muted">
            Your URL
          </span>
          <input
            ref={inputRef}
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="yoursite.com or @handle"
            className="input"
            autoComplete="url"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="submit" disabled={busy || !url.trim()} className="btn-fire w-full">
          {busy ? "Starting…" : `Dump · take this spot · ${formatMoney(cost)}`}
        </button>
      </form>
    </Modal>
  );
}
