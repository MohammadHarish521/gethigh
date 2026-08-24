import { useEffect, useState, type FormEvent } from "react";
import { usePresence } from "../hooks/usePresence";
import { MIN_RAISE } from "../lib/constants";
import { formatMoney } from "../utils/format";

type OutbidBoxProps = {
  claimPrice: number;
  amount: number;
  onAmount: (amount: number) => void;
  url: string;
  onUrl: (url: string) => void;
  onSubmit: () => Promise<void> | void;
  error: string | null;
  existingBid?: number | null;
};

export function OutbidBox({
  claimPrice,
  amount,
  onAmount,
  url,
  onUrl,
  onSubmit,
  error,
  existingBid = null,
}: OutbidBoxProps) {
  const [paying, setPaying] = useState(false);
  const [draft, setDraft] = useState(() => String(amount));
  const presence = usePresence();

  useEffect(() => {
    setDraft(String(amount));
  }, [amount]);

  function setBidFromDraft(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 7);
    setDraft(digits);
    const parsed = parseAmount(digits, claimPrice);
    if (parsed !== null) onAmount(parsed);
  }

  function commitDraft() {
    const parsed = parseAmount(draft, claimPrice);
    if (parsed === null) {
      const fallback = Math.max(claimPrice, amount);
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

  const chargeNote =
    existingBid != null && existingBid > 0
      ? `You sit at ${formatMoney(existingBid)} — this charges ${formatMoney(amount)} on top.`
      : `You pay ${formatMoney(amount)} in full.`;

  return (
    <section className="mx-auto flex max-w-[900px] flex-col items-center gap-[18px] px-4 text-center sm:px-[50px]">
      <div className="glass-pill inline-flex max-w-full flex-nowrap items-center justify-center gap-x-2 whitespace-nowrap py-[2px] pr-[10px] pl-[3px] text-[13px] tracking-[-0.26px] text-muted sm:gap-x-2.5 sm:pr-[22px]">
        <span className="chip-live">
          <span
            className="live-dot inline-block h-2.5 w-2.5 rounded-full bg-live"
            aria-hidden="true"
          />
          <b className="num font-bold">{presence?.live ?? "—"}</b> online now
        </span>
        <span>
          <b className="num font-bold text-fg">
            {presence ? presence.views.toLocaleString("en-US") : "—"}
          </b>{" "}
          views so far
        </span>
      </div>

      <h1 className="font-display text-[44px] leading-[0.98] font-extrabold tracking-[-0.06em] text-fg sm:text-[72px] lg:text-[98px]">
        <span className="dump-word">Dump</span> anyone and
        <br />
        take their <span className="dump-word">spot</span>
      </h1>
      <p className="max-w-[520px] text-[16px] leading-[1.4] font-medium tracking-[-0.36px] text-muted sm:text-[18px]">
        They hit $0 and last. Or bid {formatMoney(claimPrice)} to take #1
        outright.
      </p>

      <div className="flex w-full max-w-[640px] flex-col items-center gap-2">
        <div className="flex items-end justify-center gap-[17px] pb-2">
          <StepButton
            label={`Decrease bid by $${MIN_RAISE}`}
            onClick={() => onAmount(Math.max(claimPrice, amount - MIN_RAISE))}
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
            label={`Increase bid by $${MIN_RAISE}`}
            onClick={() => onAmount(amount + MIN_RAISE)}
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
        {`This takes #1. ${chargeNote} Every spot bleeds 5% a day, so #1 only stays #1 while you feed it.`}
      </p>
    </section>
  );
}

function parseAmount(raw: string, floor: number) {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < floor) return null;
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
