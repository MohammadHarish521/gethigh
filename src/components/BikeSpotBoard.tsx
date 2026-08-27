import { useEffect, useMemo, useState } from "react";
import type { BikeAuction, BikeFace, BikeSize, BikeSpot } from "../types";
import { formatMoney } from "../utils/format";
import { DumpFlipLabel } from "./DumpFlipLabel";
import { ProductLogo } from "./ProductLogo";
import { RankNumber } from "./RankNumber";

type BikeSpotBoardProps = {
  auction: BikeAuction;
  onClaim: (slot: string) => void;
  onFace: (face: BikeFace) => void;
};

const SIZE_MARK: Record<BikeSize, string> = {
  small: "S",
  medium: "M",
  large: "L",
};

const SIZE_WORD: Record<BikeSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

const FACE_WORD: Record<BikeFace, string> = {
  left: "Left",
  right: "Right",
  top: "Top",
};

export function BikeSpotBoard({ auction, onClaim, onFace }: BikeSpotBoardProps) {
  const [now, setNow] = useState(() => Date.now());
  const ranked = useMemo(() => rankSpots(auction.spots), [auction.spots]);
  const taken = ranked.filter((spot) => spot.occupant);
  const open = ranked.filter((spot) => !spot.occupant);
  const nextOff = soonestHeldUntil(taken, now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="mt-12 text-left">
      <div className="flex justify-center">
        <div className="glass-pill inline-flex max-w-full flex-nowrap items-center justify-center gap-x-2 whitespace-nowrap py-[2px] pr-[10px] pl-[3px] text-[13px] tracking-[-0.26px] text-muted sm:gap-x-2.5 sm:pr-[22px]">
          <span className="chip-live-cta">
            <span
              className="live-dot inline-block h-2 w-2 rounded-full"
              aria-hidden="true"
            />
            Live auction
          </span>
          <span>
            <b className="num font-bold text-fg">{auction.taken}</b> of{" "}
            {auction.total} tank spots taken
            {nextOff
              ? ` · next vinyl off in ${nextOff}`
              : ` · ${auction.termDays}d on the bike`}
          </span>
        </div>
      </div>

      <h2 className="font-display mt-4 text-center text-[32px] leading-[0.98] font-extrabold tracking-[-0.06em] text-fg sm:text-[44px]">
        The auction, <span className="dump-word">live</span>.
      </h2>
      <p className="mx-auto mt-3 max-w-[520px] text-center text-[16px] leading-[1.4] font-medium tracking-[-0.36px] text-muted">
        Every spot shows its current top bid.
      </p>
      <p className="mx-auto mt-2 max-w-[520px] text-center text-[13px] leading-[1.4] font-medium tracking-[-0.02em] text-faint">
        Spots from $80 Small · $150 Medium · $250 Large, with a premium on the
        tank top.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:gap-[14px]">
        {taken.length > 0 ? (
          <>
            <Divider label="On the tank" />
            {taken.map((spot, index) => (
              <SpotRow
                key={spot.slot}
                spot={spot}
                rank={index + 1}
                featured={index < 3}
                striped={index >= 3 && index % 2 === 1}
                onClaim={onClaim}
                onFace={onFace}
              />
            ))}
          </>
        ) : null}
        {open.length > 0 ? (
          <>
            <Divider label={taken.length > 0 ? "Open" : "Tank spots"} />
            {open.map((spot, index) => (
              <SpotRow
                key={spot.slot}
                spot={spot}
                rank={taken.length + index + 1}
                striped={index % 2 === 1}
                onClaim={onClaim}
                onFace={onFace}
              />
            ))}
          </>
        ) : null}
      </div>
    </section>
  );
}

function SpotRow({
  spot,
  rank,
  featured,
  striped,
  onClaim,
  onFace,
}: {
  spot: BikeSpot;
  rank: number;
  featured?: boolean;
  striped?: boolean;
  onClaim: (slot: string) => void;
  onFace: (face: BikeFace) => void;
}) {
  const taken = Boolean(spot.occupant);
  const rankSkin =
    featured && rank === 1
      ? "card-rank-1"
      : featured && rank === 2
        ? "card-rank-2"
        : featured && rank === 3
          ? "card-rank-3"
          : striped
            ? "card-stripe"
            : "";

  return (
    <article
      className={`card card-hover flex w-full flex-col gap-3 px-3.5 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-4 ${rankSkin}`}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={() => onFace(spot.face)}
      >
        <RankNumber rank={rank} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-medium tracking-[-0.04em] text-fg-strong sm:text-[18px]">
            {spot.label}
          </p>
          <p className="mt-0.5 text-[13px] font-medium tracking-[-0.02em] text-muted">
            {FACE_WORD[spot.face]} · {SIZE_WORD[spot.size]}
          </p>
        </div>
        <span className="chip-clicks shrink-0 py-0.5 text-[13px]">
          {SIZE_MARK[spot.size]}
        </span>
      </button>

      <div className="flex min-w-0 items-center justify-between gap-3 sm:w-[168px] sm:shrink-0">
        {spot.occupant ? (
          <a
            href={`/api/bike/${spot.slot}/go`}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 items-center gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            <ProductLogo
              src={spot.occupant.logoUrl}
              name={spot.occupant.name}
              siteUrl={spot.occupant.url}
              size="xs"
            />
            <span className="truncate text-[14px] font-medium tracking-[-0.02em] text-fg-strong">
              {spot.occupant.name}
            </span>
          </a>
        ) : (
          <span className="text-[14px] font-medium tracking-[-0.02em] text-faint">
            Available
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 sm:shrink-0">
        {taken ? (
          <span className="display-num text-[22px]">{formatMoney(spot.currentBid)}</span>
        ) : (
          <span className="text-[14px] font-medium tracking-[-0.02em] text-muted">
            from {formatMoney(spot.floor)}
          </span>
        )}
        <button
          type="button"
          disabled={spot.locked}
          onClick={() => {
            if (spot.locked) return;
            onFace(spot.face);
            onClaim(spot.slot);
          }}
          className={
            taken
              ? featured
                ? "btn-fire dump-live shrink-0 px-4 py-2 text-[14px] font-medium tracking-[-0.02em]"
                : "btn-fire-soft dump-live shrink-0 px-4 py-2 text-[14px] font-medium tracking-[-0.02em]"
              : "btn-primary shrink-0 px-4 py-2 text-[14px]"
          }
        >
          {spot.locked ? (
            "Held"
          ) : taken ? (
            <DumpFlipLabel cost={spot.minNextBid} />
          ) : (
            "Take spot"
          )}
        </button>
      </div>
    </article>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex w-full items-center gap-[10px] py-1">
      <div className="h-px flex-1 bg-line" />
      <span className="divider-pill">{label}</span>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}

function rankSpots(spots: BikeSpot[]) {
  return [...spots].sort((a, b) => {
    const aBid = a.occupant ? a.currentBid : 0;
    const bBid = b.occupant ? b.currentBid : 0;
    if (bBid !== aBid) return bBid - aBid;
    if (b.floor !== a.floor) return b.floor - a.floor;
    return a.label.localeCompare(b.label);
  });
}

function soonestHeldUntil(spots: BikeSpot[], now: number) {
  let soonest = Number.POSITIVE_INFINITY;
  for (const spot of spots) {
    const held = spot.occupant?.heldUntil
      ? new Date(spot.occupant.heldUntil).getTime()
      : NaN;
    if (Number.isFinite(held) && held > now && held < soonest) soonest = held;
  }
  if (!Number.isFinite(soonest)) return null;

  const total = Math.max(0, Math.floor((soonest - now) / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}
