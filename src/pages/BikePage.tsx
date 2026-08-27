import { useEffect, useState } from "react";
import { api } from "../api/client";
import { BikeSpotBoard } from "../components/BikeSpotBoard";
import { BikeSpotModal } from "../components/BikeSpotModal";
import { BikeTank } from "../components/BikeTank";
import { formatMoney } from "../utils/format";
import type { BikeAuction, BikeFace } from "../types";

export function BikePage() {
  const [auction, setAuction] = useState<BikeAuction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [face, setFace] = useState<BikeFace>("left");
  const [slot, setSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await api.bike();
        if (!cancelled) {
          setAuction(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load the tank.");
        }
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const active = auction?.spots.find((spot) => spot.slot === slot) ?? null;
  const progress = auction
    ? Math.min(100, Math.round((auction.raised / Math.max(auction.goal, 1)) * 100))
    : 0;

  async function submitClaim(url: string) {
    if (!slot) return;
    setClaimError(null);
    setBusy(true);
    try {
      const checkout = await api.createBikeSpot(slot, url);
      window.location.href = checkout.checkoutUrl;
    } catch (err: unknown) {
      setClaimError(
        err instanceof Error ? err.message : "Could not start checkout.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="animate-fade-up mx-auto max-w-[760px] text-center">
      <div className="glass-pill mx-auto inline-flex max-w-full flex-nowrap items-center justify-center gap-x-2 whitespace-nowrap py-[2px] pr-[10px] pl-[3px] text-[13px] tracking-[-0.26px] text-muted sm:gap-x-2.5 sm:pr-[22px]">
        <span className="chip-live-cta">
          <span
            className="live-dot inline-block h-2 w-2 rounded-full"
            aria-hidden="true"
          />
          Live auction
        </span>
        <span>
          {auction ? (
            <>
              <b className="num font-bold text-fg">{auction.taken}</b> of{" "}
              {auction.total} tank spots taken
            </>
          ) : (
            "NS400Z"
          )}
        </span>
      </div>

      <h1 className="font-display mt-5 text-[40px] leading-[0.98] font-extrabold tracking-[-0.06em] text-fg sm:text-[64px]">
        Your <span className="dump-word">brand</span>, on my{" "}
        <span className="dump-word">NS400Z</span>.
      </h1>
      <p className="mx-auto mt-3 max-w-[520px] text-[16px] leading-[1.4] font-medium tracking-[-0.36px] text-muted sm:text-[18px]">
        Twelve vinyl spots on a naked Pulsar tank. Dump them anytime. It stays on the
        bike for {auction?.termDays ?? 30} days.
      </p>

      {auction ? (
        <div className="mx-auto mt-6 max-w-[520px]">
          <div className="flex items-baseline justify-between text-[13px] font-semibold tracking-[-0.02em]">
            <span className="text-muted">
              <b className="num font-bold text-accent">{formatMoney(auction.raised)}</b>{" "}
              raised
            </span>
            <span className="text-muted">
              goal{" "}
              <b className="num font-bold text-fg">{formatMoney(auction.goal)}</b>
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-input">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        {error ? (
          <div className="card px-4 py-10 text-sm text-muted">{error}</div>
        ) : (
          <BikeTank
            face={face}
            onFace={setFace}
            spots={auction?.spots ?? []}
            onClaim={(next) => {
              const target = auction?.spots.find((spot) => spot.slot === next);
              if (target?.locked) return;
              setClaimError(null);
              setSlot(next);
            }}
          />
        )}
      </div>

      {auction ? (
        <BikeSpotBoard
          auction={auction}
          onFace={setFace}
          onClaim={(next) => {
            const target = auction.spots.find((spot) => spot.slot === next);
            if (target?.locked) return;
            setClaimError(null);
            setSlot(next);
          }}
        />
      ) : null}

      <p className="mx-auto mt-6 max-w-[460px] text-[13px] leading-[1.45] font-medium tracking-[-0.02em] text-muted">
        Vinyl goes on the real tank within 7 days of payment. Dump anyone on the
        tank — a higher bid replaces the sticker. The leaderboard is a different
        game.
      </p>

      <BikeSpotModal
        spot={active}
        termDays={auction?.termDays ?? 30}
        open={slot != null}
        busy={busy}
        error={claimError}
        onClose={() => {
          if (busy) return;
          setSlot(null);
          setClaimError(null);
        }}
        onSubmit={submitClaim}
      />
    </div>
  );
}
