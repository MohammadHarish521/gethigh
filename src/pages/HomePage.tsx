import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import {
  DumpFeed,
  ActivityFeed,
  RecentDumps,
  TopClicks,
} from "../components/DumpFeed";
import { DumpSpotModal } from "../components/DumpSpotModal";
import { Leaderboard } from "../components/Leaderboard";
import { OutbidBox } from "../components/OutbidBox";
import { SponsorRail } from "../components/SponsorRail";
import { SponsorSeatModal } from "../components/SponsorSeatModal";
import { useProducts } from "../hooks/useProducts";
import { MIN_BID, SPONSOR_PRICE, minimumNextBid } from "../lib/constants";
import type { ActivityItem, Product, RecentDump, SponsorSeat } from "../types";
import { listingsMatch, parseListingInput } from "../utils/format";
import { makeLogo } from "../utils/logo";

export function HomePage() {
  const { products, loading, error: loadError } = useProducts();
  const [searchParams] = useSearchParams();
  const [url, setUrl] = useState(searchParams.get("url") ?? "");
  const [amount, setAmount] = useState(MIN_BID);
  const [error, setError] = useState<string | null>(null);
  const [dumpingId, setDumpingId] = useState<string | null>(null);
  const [dumpTarget, setDumpTarget] = useState<Product | null>(null);
  const [dumpError, setDumpError] = useState<string | null>(null);
  const [dumps, setDumps] = useState<RecentDump[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [sponsorSeats, setSponsorSeats] = useState<SponsorSeat[]>(emptySponsorSeats);
  const [sponsorPrice, setSponsorPrice] = useState(SPONSOR_PRICE);
  const [sponsorSlot, setSponsorSlot] = useState<string | null>(null);
  const [sponsorError, setSponsorError] = useState<string | null>(null);
  const [sponsorBusy, setSponsorBusy] = useState(false);

  const topBid = products[0]?.currentBid ?? 0;
  const claimPrice = products[0]?.minNextBid ?? minimumNextBid(topBid);

  useEffect(() => {
    setAmount(claimPrice);
  }, [claimPrice]);

  useEffect(() => {
    const fromQuery = searchParams.get("url");
    if (fromQuery) setUrl(fromQuery);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    function loadFeed() {
      Promise.all([api.recentDumps(), api.recentActivity(), api.sponsors()])
        .then(([dumpData, activityData, sponsorData]) => {
          if (cancelled) return;
          setDumps(dumpData.dumps);
          setActivity(activityData.activity);
          setSponsorSeats(sponsorData.seats);
          setSponsorPrice(sponsorData.price);
        })
        .catch(() => {
          if (cancelled) return;
          setDumps([]);
          setActivity([]);
        });
    }

    loadFeed();
    return () => {
      cancelled = true;
    };
  }, []);

  const existing = findExisting(products, url);

  function onDump(product: Product) {
    setError(null);
    setDumpError(null);
    setDumpTarget(product);
  }

  async function submitDump(claimUrl: string) {
    if (!dumpTarget) return;
    setDumpError(null);
    setDumpingId(dumpTarget.id);
    try {
      const checkout = await api.createDump(dumpTarget.id, claimUrl);
      window.location.href = checkout.checkoutUrl;
    } catch (err: unknown) {
      setDumpError(
        err instanceof Error ? err.message : "Could not start that dump.",
      );
      setDumpingId(null);
    }
  }

  async function submitSponsor(url: string) {
    if (!sponsorSlot) return;
    setSponsorError(null);
    setSponsorBusy(true);
    try {
      const checkout = await api.createSponsor(sponsorSlot, url);
      window.location.href = checkout.checkoutUrl;
    } catch (err: unknown) {
      setSponsorError(
        err instanceof Error ? err.message : "Could not take that seat.",
      );
      setSponsorBusy(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)_240px] lg:items-start lg:gap-4 xl:grid-cols-[260px_minmax(0,1fr)_260px] xl:gap-5">
        <div className="hidden lg:block lg:sticky lg:top-24">
          <SponsorRail
            side="left"
            seats={sponsorSeats}
            price={sponsorPrice}
            onClaim={(slot) => {
              setSponsorError(null);
              setSponsorSlot(slot);
            }}
          />
        </div>
        <div className="min-w-0">
          <OutbidBox
            claimPrice={claimPrice}
            amount={amount}
            onAmount={(value) => {
              setAmount(value);
              setError(null);
            }}
            url={url}
            onUrl={(value) => {
              setUrl(value);
              setError(null);
            }}
            existingBid={existing?.currentBid ?? null}
            error={error}
            onSubmit={async () => {
              try {
                const listing = parseListingInput(url);
                const match = findExisting(products, url);
                const checkout = match
                  ? await api.createBid(match.id, amount)
                  : await api.submitProduct({
                      name: listing.name,
                      description: `Listed from ${listing.hostname}.`,
                      url: listing.url,
                      logoUrl: makeLogo(listing.name, "#508200"),
                      creatorName: listing.name,
                      startingBid: amount,
                    });
                window.location.href = checkout.checkoutUrl;
              } catch (err: unknown) {
                setError(
                  err instanceof Error ? err.message : "Could not place that bid.",
                );
              }
            }}
          />
          <p className="mt-3 text-center">
            <Link
              to="/bike"
              className="text-[13px] font-semibold tracking-[-0.02em] text-accent hover:underline"
            >
              Your logo on my NS400Z →
            </Link>
          </p>
        </div>
        <div className="hidden lg:block lg:sticky lg:top-24">
          <SponsorRail
            side="right"
            seats={sponsorSeats}
            price={sponsorPrice}
            onClaim={(slot) => {
              setSponsorError(null);
              setSponsorSlot(slot);
            }}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:hidden">
        <SponsorRail
          side="left"
          seats={sponsorSeats}
          price={sponsorPrice}
          onClaim={(slot) => {
            setSponsorError(null);
            setSponsorSlot(slot);
          }}
        />
        <SponsorRail
          side="right"
          seats={sponsorSeats}
          price={sponsorPrice}
          onClaim={(slot) => {
            setSponsorError(null);
            setSponsorSlot(slot);
          }}
        />
      </div>

      <div className="mt-8 lg:mt-10">
        <div className="hidden lg:grid lg:grid-cols-[240px_minmax(0,1fr)_240px] lg:items-start lg:gap-4 xl:grid-cols-[260px_minmax(0,1fr)_260px] xl:gap-5">
          <aside className="sticky top-24">
            <ActivityFeed items={activity} />
          </aside>
          <div className="min-w-0">
            <Board
              loading={loading}
              loadError={loadError}
              products={products}
              onTakeOne={() => {
                setAmount(claimPrice);
                setError(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onDump={onDump}
              dumpingId={dumpingId}
            />
          </div>
          <aside className="sticky top-24 flex flex-col gap-4">
            <RecentDumps
              dumps={dumps}
              onDumpTop={products[0] ? () => onDump(products[0]) : undefined}
            />
            <TopClicks products={products} />
          </aside>
        </div>

        <div className="lg:hidden">
          <Board
            loading={loading}
            loadError={loadError}
            products={products}
            onTakeOne={() => {
              setAmount(claimPrice);
              setError(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onDump={onDump}
            dumpingId={dumpingId}
          />
          <div className="mt-6">
            <DumpFeed
              dumps={dumps}
              activity={activity}
              products={products}
              onDumpTop={products[0] ? () => onDump(products[0]) : undefined}
            />
          </div>
        </div>
      </div>

      <DumpSpotModal
        product={dumpTarget}
        open={dumpTarget != null}
        busy={dumpingId === dumpTarget?.id}
        error={dumpError}
        onClose={() => {
          if (dumpingId) return;
          setDumpTarget(null);
          setDumpError(null);
        }}
        onSubmit={submitDump}
      />
      <SponsorSeatModal
        slot={sponsorSlot}
        price={sponsorPrice}
        open={sponsorSlot != null}
        busy={sponsorBusy}
        error={sponsorError}
        onClose={() => {
          if (sponsorBusy) return;
          setSponsorSlot(null);
          setSponsorError(null);
        }}
        onSubmit={submitSponsor}
      />
    </div>
  );
}

function findExisting(products: Product[], raw: string) {
  if (!raw.trim()) return null;
  try {
    const listing = parseListingInput(raw);
    return products.find((product) => listingsMatch(product, listing)) ?? null;
  } catch {
    return null;
  }
}

function emptySponsorSeats(): SponsorSeat[] {
  return (["left", "right"] as const).flatMap((side) =>
    [1, 2, 3, 4, 5].map((index) => ({
      slot: `${side}-${index}`,
      side,
      index,
      occupant: null,
    })),
  );
}

function Board({
  loading,
  loadError,
  products,
  onTakeOne,
  onDump,
  dumpingId,
}: {
  loading: boolean;
  loadError: string | null;
  products: Product[];
  onTakeOne: () => void;
  onDump: (product: Product) => void;
  dumpingId: string | null;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 sm:gap-[14px]">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card h-[132px] animate-pulse" />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="card px-4 py-10 text-center text-sm text-muted">
        {loadError}
      </div>
    );
  }

  return (
    <Leaderboard
      products={products}
      onTakeOne={onTakeOne}
      onDump={onDump}
      dumpingId={dumpingId}
    />
  );
}
