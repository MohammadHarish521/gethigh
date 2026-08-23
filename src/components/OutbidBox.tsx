import { useEffect, useState, type FormEvent } from "react";
import { formatMoney } from "../utils/format";

type OutbidBoxProps = {
  claimPrice: number;
  amount: number;
  onAmount: (amount: number) => void;
  url: string;
  onUrl: (url: string) => void;
  previewRank: number;
  onSubmit: () => Promise<void> | void;
  error: string | null;
  liveCount?: number;
  existingBid?: number | null;
};

export function OutbidBox({
  claimPrice,
  amount,
  onAmount,
  url,
  onUrl,
  previewRank,
  onSubmit,
  error,
  liveCount = 0,
  existingBid = null,
}: OutbidBoxProps) {
  const [paying, setPaying] = useState(false);
  const [draft, setDraft] = useState(() => String(amount));

  useEffect(() => {
    setDraft(String(amount));
  }, [amount]);

  function setBidFromDraft(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 7);
    setDraft(digits);
    const parsed = parseAmount(digits);
    if (parsed !== null) onAmount(parsed);
  }

  function commitDraft() {
    const parsed = parseAmount(draft);
    if (parsed === null) {
      const fallback = Math.max(1, amount);
      setDraft(String(fallback));
      onAmount(fallback);
      return;
    }
    setDraft(String(parsed));
    onAmount(parsed);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPaying(true);
    try {
      await onSubmit();
    } finally {
      setPaying(false);
    }
  }

  const takesTop = amount >= claimPrice;
  const extraPay =
    existingBid != null && existingBid > 0 && amount > existingBid
      ? amount - existingBid
      : null;

  return (
    <section className="mx-auto flex max-w-[900px] flex-col items-center gap-[18px] px-4 text-center sm:px-[50px]">
      <div className="glass-pill max-w-full flex-nowrap gap-x-2 py-1 pr-4 pl-1 text-[13px] tracking-[-0.26px] text-muted">
        <span className="chip-live gap-1.5 py-0.5 text-[12px] font-semibold">
          <span className="live-dot inline-block h-2 w-2 rounded-full bg-live" />
          Online
        </span>
        {liveCount === 0 ? (
          <span>
            <b className="font-bold text-fg-strong">$1</b> takes #1
          </span>
        ) : (
          <span>
            <b className="font-bold text-fg-strong">{liveCount}</b> on the board
          </span>
        )}
      </div>

      <h1 className="font-display text-[44px] leading-[0.98] font-extrabold tracking-[-0.06em] text-fg sm:text-[72px] lg:text-[98px]">
        <span className="dump-word">Dump</span> whoever’s
        <br />
        at <span className="dump-word">#1</span>
      </h1>
      <p className="max-w-[520px] text-[16px] leading-[1.4] font-medium tracking-[-0.36px] text-muted sm:text-[18px]">
        <span className="font-semibold text-fire-deep">
          Dump them — your URL takes the spot
        </span>
        . They hit $0 and last. Or bid from $1 to climb.
      </p>

      <div className="flex w-full max-w-[640px] flex-col items-center gap-2">
        <div className="flex items-end justify-center gap-[17px] pb-2">
          <StepButton
            label="Decrease bid by $1"
            onClick={() => onAmount(Math.max(1, amount - 1))}
          >
            −
          </StepButton>
          <label className="flex flex-col items-center">
            <span className="mb-1 text-[12px] font-medium tracking-[-0.02em] text-faint">
              Next bid
            </span>
            <span className="inline-flex items-center">
              <span className="display-num text-[44px] sm:text-[68.59px]">$</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label="Next bid amount in US dollars"
                value={draft}
                onChange={(event) => setBidFromDraft(event.target.value)}
                onBlur={commitDraft}
                onFocus={(event) => event.currentTarget.select()}
                className="display-num m-0 w-auto border-0 bg-transparent p-0 text-[44px] outline-none sm:text-[68.59px]"
                style={{ width: `${Math.max(draft.length, 2) + 0.2}ch` }}
              />
            </span>
          </label>
          <StepButton
            label="Increase bid by $1"
            onClick={() => onAmount(amount + 1)}
          >
            +
          </StepButton>
        </div>

        <form onSubmit={submit} className="relative w-full">
          <div className="flex items-center gap-2 rounded-full bg-input py-[6px] pr-[6px] pl-3.5 ring-2 ring-white shadow-[0_8px_18px_rgb(183_181_203/0.22)] sm:gap-3 sm:py-[7px] sm:pr-[7px] sm:pl-5 focus-within:ring-[#50820040]">
            <svg
              className="size-5 shrink-0 text-fg/40 sm:size-6"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5.93"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M14 11a5 5 0 0 0-7.07 0L5.52 12.41a5 5 0 0 0 7.07 7.07L14 18.07"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={url}
              onChange={(event) => onUrl(event.target.value)}
              placeholder="Product URL or @handle…"
              className="min-w-0 flex-1 bg-transparent text-[15px] leading-[1.2] text-fg outline-none placeholder:text-black/40 sm:text-[17px]"
              autoComplete="url"
            />
            <button
              type="submit"
              disabled={paying}
              className="btn-primary shrink-0 px-4 py-2.5 text-[15px] sm:px-[28px] sm:py-[12px] sm:text-[17px]"
            >
              {paying ? "Paying…" : `Bid ${formatMoney(amount)}`}
            </button>
          </div>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </form>
      </div>

      <p className="max-w-[424px] text-[14px] leading-[1.4] font-medium tracking-[-0.3px] text-muted-strong">
        {takesTop
          ? extraPay != null
            ? `This takes #1. You pay ${formatMoney(extraPay)} more — same URL only charges the difference.`
            : "This takes #1. Same URL again only charges the difference."
          : extraPay != null
            ? `This lands at #${previewRank}. You pay ${formatMoney(extraPay)} more.`
            : `This lands at #${previewRank}. Dump is on every listing — costs whatever they’re sitting at.`}
      </p>
    </section>
  );
}

function parseAmount(raw: string) {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return null;
  return value;
}

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-[52px] items-center justify-center overflow-clip rounded-[15px] bg-accent-soft text-[32px] leading-none text-fg transition-[transform,filter,box-shadow] duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-px hover:brightness-[1.04] hover:shadow-[0_4px_10px_rgb(80_130_0/0.12)] active:translate-y-0 sm:size-[62px]"
    >
      {children}
    </button>
  );
}
