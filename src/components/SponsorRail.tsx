import { Pointer } from "lucide-react";
import { useEffect, useState } from "react";
import type { SponsorOccupant, SponsorSeat } from "../types";
import { formatMoney, plural } from "../utils/format";
import { ProductLogo } from "./ProductLogo";

type SponsorRailProps = {
  side: "left" | "right";
  seats: SponsorSeat[];
  price: number;
  onClaim: (slot: string) => void;
};

export function SponsorRail({ side, seats, price, onClaim }: SponsorRailProps) {
  const column = seats.filter((seat) => seat.side === side);

  return (
    <section className="card-sm flex flex-col px-3 py-3.5 sm:px-3.5">
      <div className="px-1 pb-3 text-center">
        <p className="text-[13px] font-semibold tracking-[-0.03em] text-fg-strong">
          Sponsor seats
        </p>
        <p className="mt-0.5 text-[12px] leading-[1.35] font-medium tracking-[-0.02em] text-muted">
          Take the sponsor seat. {formatMoney(price)} one time.
        </p>
      </div>
      <ol className="flex flex-col gap-2">
        {column.map((seat) => (
          <li key={seat.slot}>
            {seat.occupant ? (
              <OccupiedSeat seat={seat} occupant={seat.occupant} />
            ) : (
              <button
                type="button"
                onClick={() => onClaim(seat.slot)}
                aria-label={`Take sponsor seat ${seat.index}, ${formatMoney(price)} one-time`}
                className="flex w-full items-center gap-2.5 rounded-[16px] bg-white/65 px-2 py-2 ring-1 ring-white shadow-[0_8px_18px_rgb(183_181_203/0.16)] transition-[transform,filter,box-shadow] duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-px hover:brightness-[1.04] hover:shadow-[0_10px_22px_rgb(183_181_203/0.22)]"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-accent-soft text-[22px] leading-none text-fg"
                  aria-hidden="true"
                >
                  +
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-[13px] font-semibold tracking-[-0.03em] text-fg-strong">
                    Open
                  </span>
                  <span className="block text-[11px] font-medium tracking-[-0.02em] text-muted">
                    {formatMoney(price)} one-time
                  </span>
                </span>
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function OccupiedSeat({
  seat,
  occupant,
}: {
  seat: SponsorSeat;
  occupant: SponsorOccupant;
}) {
  const [clicks, setClicks] = useState(occupant.clickCount);

  useEffect(() => {
    setClicks(occupant.clickCount);
  }, [occupant.clickCount]);

  return (
    <a
      href={`/api/sponsors/${seat.slot}/go`}
      target="_blank"
      rel="noreferrer"
      onClick={() => setClicks((count) => count + 1)}
      className="flex w-full items-center gap-2.5 rounded-[16px] bg-white/80 px-2 py-2 ring-1 ring-white shadow-[0_8px_18px_rgb(183_181_203/0.16)] transition-[transform,box-shadow] duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-px hover:shadow-[0_10px_22px_rgb(183_181_203/0.22)]"
    >
      <ProductLogo
        src={occupant.logoUrl}
        name={occupant.name}
        siteUrl={occupant.url}
        size="xs"
      />
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[13px] font-semibold tracking-[-0.03em] text-fg-strong">
          {occupant.name}
        </span>
        <span
          title={plural(clicks, "click")}
          className="chip-clicks-blue mt-0.5 inline-flex py-0 pr-1.5 pl-1 text-[11px]"
        >
          <Pointer size={11} strokeWidth={2.4} aria-hidden="true" />
          <span className="num">{clicks.toLocaleString("en-US")}</span>
        </span>
      </span>
    </a>
  );
}
