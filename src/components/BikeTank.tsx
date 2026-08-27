import { useRef, useState } from "react";
import type { BikeFace, BikeSpot } from "../types";
import { formatMoney } from "../utils/format";
import { DumpFlipLabel } from "./DumpFlipLabel";
import { ProductLogo } from "./ProductLogo";

const FACES: { id: BikeFace; label: string }[] = [
  { id: "left", label: "Left" },
  { id: "top", label: "Top" },
  { id: "right", label: "Right" },
];

const FACE_IMG: Record<BikeFace, { src: string; alt: string }> = {
  left: { src: "/bikefueltankleft.png", alt: "NS400Z left fuel tank" },
  right: { src: "/bikefueltankright.png", alt: "NS400Z right fuel tank" },
  top: { src: "/bikefueltop.png", alt: "NS400Z fuel tank from above" },
};

type BikeTankProps = {
  face: BikeFace;
  onFace: (face: BikeFace) => void;
  spots: BikeSpot[];
  onClaim: (slot: string) => void;
};

export function BikeTank({ face, onFace, spots, onClaim }: BikeTankProps) {
  const visible = spots.filter((spot) => spot.face === face);
  const image = FACE_IMG[face];
  const [hovered, setHovered] = useState<string | null>(null);
  const hoverTimer = useRef<number>(0);

  function enter(slot: string) {
    window.clearTimeout(hoverTimer.current);
    setHovered(slot);
  }

  function leave() {
    hoverTimer.current = window.setTimeout(() => setHovered(null), 140);
  }

  return (
    <div>
      <div className="flex justify-center">
        <div className="glass-pill p-1">
          {FACES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onFace(item.id)}
              className={
                face === item.id
                  ? "divider-pill"
                  : "rounded-full px-4 py-2 text-[14px] font-medium tracking-[-0.5px] text-muted transition hover:text-fg"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bike-stage mt-5">
        <div
          className={
            face === "top"
              ? "relative mx-auto w-full max-w-[520px]"
              : "relative w-full"
          }
        >
          <img
            src={image.src}
            alt={image.alt}
            draggable={false}
            className="pointer-events-none h-auto w-full select-none"
          />
          <svg
            className="bike-hotzone inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="false"
          >
            {visible.map((spot) => (
              <TankPoly
                key={spot.slot}
                spot={spot}
                hot={hovered === spot.slot}
                onClaim={onClaim}
                onEnter={() => enter(spot.slot)}
                onLeave={leave}
              />
            ))}
          </svg>
          {visible.map((spot) => (
            <SpotLabel
              key={`${spot.slot}-label`}
              spot={spot}
              hot={hovered === spot.slot}
              onClaim={onClaim}
              onEnter={() => enter(spot.slot)}
              onLeave={leave}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TankPoly({
  spot,
  hot,
  onClaim,
  onEnter,
  onLeave,
}: {
  spot: BikeSpot;
  hot: boolean;
  onClaim: (slot: string) => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const taken = Boolean(spot.occupant);
  const points = (spot.points ?? []).map((point) => point.join(",")).join(" ");

  function claim() {
    if (spot.locked) return;
    onClaim(spot.slot);
  }

  return (
    <polygon
      points={points}
      role="button"
      tabIndex={spot.locked ? -1 : 0}
      aria-label={
        taken
          ? `Dump ${spot.label}, ${formatMoney(spot.minNextBid)}`
          : `${spot.label}, from ${formatMoney(spot.floor)}`
      }
      className={`bike-spot-poly${taken ? " bike-spot-poly-taken" : ""}${hot ? " bike-spot-poly-hot" : ""}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onClick={claim}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          claim();
        }
      }}
    />
  );
}

function SpotLabel({
  spot,
  hot,
  onClaim,
  onEnter,
  onLeave,
}: {
  spot: BikeSpot;
  hot: boolean;
  onClaim: (slot: string) => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const [cx, cy] = centroid(spot.points ?? []);
  const taken = Boolean(spot.occupant);

  return (
    <div
      className={`absolute z-[3] -translate-x-1/2 -translate-y-1/2 text-center ${taken ? "pointer-events-auto" : "pointer-events-none"}`}
      style={{ left: `${cx}%`, top: `${cy}%` }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {taken && spot.occupant ? (
        <div className="flex flex-col items-center">
          <a
            href={`/api/bike/${spot.slot}/go`}
            target="_blank"
            rel="noreferrer"
            className={`bike-sticker transition-opacity duration-150 ${hot ? "opacity-40" : ""}`}
          >
            <ProductLogo
              src={spot.occupant.logoUrl}
              name={spot.occupant.name}
              siteUrl={spot.occupant.url}
              size={spot.size === "large" ? "sm" : "xs"}
            />
          </a>
          {hot && !spot.locked ? (
            <button
              type="button"
              className="btn-fire dump-live mt-1 px-3 py-1.5 text-[13px] font-medium tracking-[-0.02em] shadow-[0_8px_18px_rgb(223_92_15/0.35)]"
              onClick={(event) => {
                event.stopPropagation();
                onClaim(spot.slot);
              }}
            >
              <DumpFlipLabel cost={spot.minNextBid} />
            </button>
          ) : (
            <span className="mt-1 text-[11px] font-semibold tracking-[-0.02em] text-white [text-shadow:0_1px_2px_rgb(0_0_0_/_0.55)]">
              {formatMoney(spot.currentBid)}
            </span>
          )}
        </div>
      ) : (
        <>
          <span className="block text-[10px] font-bold tracking-[0.04em] text-white uppercase [text-shadow:0_1px_2px_rgb(0_0_0_/_0.55)]">
            {spot.size === "large"
              ? "Large"
              : spot.size === "medium"
                ? "Mid"
                : "Spot"}
          </span>
          <span className="block text-[12px] font-semibold text-white [text-shadow:0_1px_2px_rgb(0_0_0_/_0.55)]">
            from {formatMoney(spot.floor)}
          </span>
        </>
      )}
    </div>
  );
}

function centroid(points: Array<[number, number]>): [number, number] {
  if (points.length === 0) return [50, 50];
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    const cross = x1 * y2 - x2 * y1;
    area += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  if (Math.abs(area) < 0.0001) {
    const sum = points.reduce(
      (acc, [x, y]) => [acc[0] + x, acc[1] + y] as [number, number],
      [0, 0],
    );
    return [sum[0] / points.length, sum[1] / points.length];
  }
  area *= 0.5;
  return [cx / (6 * area), cy / (6 * area)];
}
