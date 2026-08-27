import { useEffect, useRef, useState, type FormEvent } from "react";
import type { BikeSize, BikeSpot } from "../types";
import { formatMoney } from "../utils/format";
import { Modal } from "./Modal";
import { ProductLogo } from "./ProductLogo";

const SIZE_WORD: Record<BikeSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

type BikeSpotModalProps = {
  spot: BikeSpot | null;
  termDays: number;
  open: boolean;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (url: string, size: BikeSize) => Promise<void> | void;
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
  const [size, setSize] = useState<BikeSize>("small");
  const inputRef = useRef<HTMLInputElement>(null);
  const taken = Boolean(spot?.occupant);
  const option =
    spot?.sizeOptions.find((item) => item.size === size && item.allowed) ??
    spot?.sizeOptions.find((item) => item.allowed);
  const selectedSize = option?.size ?? size;
  const price = option?.minNextBid ?? spot?.minNextBid ?? 0;

  useEffect(() => {
    if (!spot || !open) return;
    setUrl("");
    const current = taken ? spot.size : "small";
    const fallback =
      spot.sizeOptions.find((item) => item.size === current && item.allowed) ??
      spot.sizeOptions.find((item) => item.allowed);
    setSize(fallback?.size ?? "small");
    window.setTimeout(() => inputRef.current?.focus(), 40);
  }, [spot, open, taken]);

  if (!spot) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!url.trim() || busy || !option?.allowed) return;
    await onSubmit(url.trim(), selectedSize);
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
              On the tank now · {SIZE_WORD[spot.size]}
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
        {formatMoney(price)} for {termDays} days of vinyl on the NS400Z —{" "}
        {spot.label.toLowerCase()} ({SIZE_WORD[spot.locationSize]} spot). Bigger
        vinyl is 1.2× on this spot’s ladder. Dumping is always 1.2× the bid.
        {taken ? " Their sticker comes off. Yours goes on." : ""}
      </p>

      <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
        <div>
          <span className="mb-1.5 block text-[13px] font-medium tracking-[-0.02em] text-muted">
            Vinyl size
          </span>
          <div className="flex justify-start">
            <div className="glass-pill max-w-full flex-wrap p-1">
              {spot.sizeOptions.map((item) => (
                <button
                  key={item.size}
                  type="button"
                  disabled={!item.allowed || busy}
                  onClick={() => {
                    if (!item.allowed) return;
                    setSize(item.size);
                  }}
                  className={
                    selectedSize === item.size
                      ? "divider-pill"
                      : "rounded-full px-3 py-2 text-[13px] font-medium tracking-[-0.5px] text-muted transition hover:text-fg disabled:opacity-40"
                  }
                >
                  {SIZE_WORD[item.size]} · {formatMoney(item.minNextBid)}
                </button>
              ))}
            </div>
          </div>
        </div>
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
          disabled={busy || !url.trim() || spot.locked || !option?.allowed}
          className={taken ? "btn-fire dump-live w-full" : "btn-primary w-full"}
        >
          {busy
            ? "Starting…"
            : `${taken ? "Dump" : "Take spot"} · ${formatMoney(price)}`}
        </button>
      </form>
    </Modal>
  );
}
