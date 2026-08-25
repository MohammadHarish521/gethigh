import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatMoney } from "../utils/format";
import { Modal } from "./Modal";

type SponsorSeatModalProps = {
  slot: string | null;
  price: number;
  open: boolean;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (url: string) => Promise<void> | void;
};

export function SponsorSeatModal({
  slot,
  price,
  open,
  busy,
  error,
  onClose,
  onSubmit,
}: SponsorSeatModalProps) {
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (slot && open) {
      setUrl("");
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [slot, open]);

  if (!slot) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!url.trim() || busy) return;
    await onSubmit(url.trim());
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="sponsor-seat-title">
      <h2
        id="sponsor-seat-title"
        className="text-[20px] font-semibold tracking-[-0.04em] text-fg-strong"
      >
        Take the sponsor seat
      </h2>
      <p className="mt-1 text-[14px] leading-[1.4] font-medium tracking-[-0.02em] text-muted">
        {formatMoney(price)} one time. Your logo sits here permanently — no
        decay, no dump.
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
          disabled={busy || !url.trim()}
          className="btn-primary w-full"
        >
          {busy ? "Starting…" : `Take seat · ${formatMoney(price)}`}
        </button>
      </form>
    </Modal>
  );
}
