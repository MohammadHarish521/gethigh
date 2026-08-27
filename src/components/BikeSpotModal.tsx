import { useEffect, useRef, useState, type FormEvent } from "react";
import type { BikeSpot } from "../types";
import { formatMoney } from "../utils/format";
import { Modal } from "./Modal";
import { ProductLogo } from "./ProductLogo";

type BikeSpotModalProps = {
  spot: BikeSpot | null;
  termDays: number;
  open: boolean;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (url: string) => Promise<void> | void;
};

export function BikeSpotModal({
  spot,
  termDays,
  open,
  busy,
  error,
  onClose,
  onSubmit,
}: BikeSpotModalProps) {
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const taken = Boolean(spot?.occupant);

  useEffect(() => {
    if (spot && open) {
      setUrl("");
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [spot, open]);

  if (!spot) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!url.trim() || busy) return;
    await onSubmit(url.trim());
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="bike-spot-title">
      {spot.occupant ? (
        <div className="mb-4 flex items-center gap-3">
          <ProductLogo
            src={spot.occupant.logoUrl}
            name={spot.occupant.name}
            siteUrl={spot.occupant.url}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-muted">
              On the tank now
            </p>
            <p className="truncate text-[16px] font-semibold tracking-[-0.03em] text-fg-strong">
              {spot.occupant.name}
            </p>
          </div>
        </div>
      ) : null}

      <h2
        id="bike-spot-title"
        className="text-[20px] font-semibold tracking-[-0.04em] text-fg-strong"
      >
        {taken ? "Dump this spot" : "Take this spot"}
      </h2>
      <p className="mt-1 text-[14px] leading-[1.4] font-medium tracking-[-0.02em] text-muted">
        {formatMoney(spot.minNextBid)} for {termDays} days of vinyl on the
        NS400Z — {spot.label.toLowerCase()}.{" "}
        {taken
          ? "Their sticker comes off. Yours goes on."
          : "Anyone can dump you later."}
      </p>

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
        <button
          type="submit"
          disabled={busy || !url.trim() || spot.locked}
          className={taken ? "btn-fire dump-live w-full" : "btn-primary w-full"}
        >
          {busy
            ? "Starting…"
            : `${taken ? "Dump" : "Take spot"} · ${formatMoney(spot.minNextBid)}`}
        </button>
      </form>
    </Modal>
  );
}
