import { useMemo } from "react";
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
  const ranked = useMemo(() => rankSpots(auction.spots), [auction.spots]);
  const taken = ranked.filter((spot) => spot.occupant);
  const open = ranked.filter((spot) => !spot.occupant);

  return (
    <section className="mt-12 text-left">
      <h2 className="font-display text-center text-[32px] leading-[0.98] font-extrabold tracking-[-0.06em] text-fg sm:text-[44px]">
        The auction, <span className="dump-word">live</span>.
      </h2>
      <p className="mx-auto mt-3 max-w-[520px] text-center text-[16px] leading-[1.4] font-medium tracking-[-0.36px] text-muted">
        Every spot shows its current top bid.
      </p>
      <p className="mx-auto mt-2 max-w-[520px] text-center text-[13px] leading-[1.4] font-medium tracking-[-0.02em] text-faint">
        Small from {formatMoney(auction.sizes.small)} · Mid from{" "}
        {formatMoney(auction.sizes.medium)} · Large from{" "}
        {formatMoney(auction.sizes.large)}. Bigger vinyl is 1.2× on that
        spot’s ladder. Dump is always {auction.outbidMult}×.
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
            {FACE_WORD[spot.face]} ·{" "}
            {SIZE_WORD[taken ? spot.size : spot.locationSize]}
            {taken ? " vinyl" : ""}
          </p>
        </div>
        <span className="chip-clicks shrink-0 py-0.5 text-[13px]">
          {SIZE_MARK[taken ? spot.size : spot.locationSize]}
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
