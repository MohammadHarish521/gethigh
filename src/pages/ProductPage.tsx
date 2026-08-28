import { Pointer } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { BidHistory } from "../components/BidHistory";
import { BidModal } from "../components/BidModal";
import { DumpFlipLabel } from "../components/DumpFlipLabel";
import { DumpSpotModal } from "../components/DumpSpotModal";
import { EmptyState } from "../components/EmptyState";
import { ProductLogo } from "../components/ProductLogo";
import { RankNumber } from "../components/RankNumber";
import { boardHomePath } from "../lib/constants";
import type { BidHistoryItem, Product } from "../types";
import {
  clicksPerDollar,
  formatMoney,
  formatTimeAgo,
  outboundPath,
  plural,
} from "../utils/format";

export function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [bids, setBids] = useState<BidHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dumping, setDumping] = useState(false);
  const [dumpError, setDumpError] = useState<string | null>(null);
  const [dumpOpen, setDumpOpen] = useState(false);
  const [bidOpen, setBidOpen] = useState(false);
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .product(id)
      .then((data) => {
        setProduct(data.product);
        setBids(data.bids);
        setClicks(data.product.clickCount ?? 0);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Product not found.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function onDump() {
    if (!product) return;
    setDumpError(null);
    setDumpOpen(true);
  }

  async function submitDump(claimUrl: string) {
    if (!product) return;
    setDumpError(null);
    setDumping(true);
    try {
      const checkout = await api.createDump(product.id, claimUrl);
      window.location.href = checkout.checkoutUrl;
    } catch (err: unknown) {
      setDumpError(
        err instanceof Error ? err.message : "Could not start that dump.",
      );
      setDumping(false);
    }
  }

  if (loading)
    return (
      <div className="mx-auto max-w-[792px]">
        <div className="card h-44 animate-pulse" />
      </div>
    );

  if (error || !product) {
    return (
      <EmptyState
        icon="search"
        title="Product not found"
        description={error || "It may have been dumped off the board."}
        action={
          <Link to="/" className="btn-primary">
            Back to the board
          </Link>
        }
      />
    );
  }

  const perDollar = clicksPerDollar(clicks, product.currentBid);

  return (
    <div className="animate-fade-up mx-auto max-w-[792px]">
      <Link
        to={boardHomePath(product.board)}
        className="mb-4 inline-block px-1 text-[14px] font-medium tracking-[-0.26px] text-muted hover:text-fg hover:underline"
      >
        ← Leaderboard
      </Link>

      <article className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          <div className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start gap-3.5 sm:gap-4">
              <a
                href={outboundPath(product.id)}
                target="_blank"
                rel="noreferrer"
                onClick={() => setClicks((count) => count + 1)}
                className="shrink-0 rounded-2xl"
                aria-label={`Visit ${product.name}`}
              >
                <ProductLogo
                  src={product.logoUrl}
                  name={product.name}
                  siteUrl={product.url}
                  size="lg"
                />
              </a>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <RankNumber rank={product.rank} />
                  <h1 className="text-[22px] leading-[1.2] font-semibold tracking-[-0.04em] text-fg-strong sm:text-[26px] sm:leading-[1.2]">
                    <a
                      href={outboundPath(product.id)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setClicks((count) => count + 1)}
                      className="hover:underline"
                    >
                      {product.name}
                    </a>
                  </h1>
                </div>
                <p className="mt-1.5 text-[15px] leading-[1.45] font-medium tracking-[-0.02em] text-muted">
                  {product.description}
                </p>
                <a
                  href={outboundPath(product.id)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setClicks((count) => count + 1)}
                  className="mt-1.5 inline-block text-[13px] font-medium tracking-[-0.02em] text-faint hover:text-fg hover:underline"
                >
                  {product.hostname}
                </a>
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
                  <span className="chip-clicks-blue shrink-0">
                    <Pointer size={14} strokeWidth={2.4} aria-hidden="true" />
                    {plural(clicks, "click")}
                  </span>
                  <span className="text-[13px] font-medium tracking-[-0.02em] text-muted">
                    {plural(product.bidCount, "bid")}
                  </span>
                  {product.currentBidAt ? (
                    <>
                      <span className="text-muted" aria-hidden="true">
                        ·
                      </span>
                      <time className="text-[13px] font-medium tracking-[-0.02em] text-muted">
                        {formatTimeAgo(product.currentBidAt)}
                      </time>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col justify-center gap-3.5 border-t border-line/70 bg-[#ebebeb] px-4 py-4 sm:w-[220px] sm:border-t-0 sm:border-l sm:px-5 sm:py-5">
            <div>
              <div className="display-num text-[32px] leading-none">
                {formatMoney(product.currentBid)}
              </div>
              {product.decayPerDay > 0 ? (
                <p
                  title="Every spot bleeds 5% of its price each day"
                  className="mt-1.5 text-[13px] font-medium tracking-[-0.02em] text-fire-deep"
                >
                  −{formatMoney(product.decayPerDay)}/day
                </p>
              ) : null}
              {perDollar ? (
                <p
                  title="Clicks generated per dollar on this listing"
                  className="chip-clicks mt-2"
                >
                  <b className="num">{perDollar}</b> clicks/$
                </p>
              ) : null}
            </div>
            {dumpError ? (
              <p className="text-sm text-red-600">{dumpError}</p>
            ) : null}
            <button
              type="button"
              onClick={() => setBidOpen(true)}
              className="btn-ghost w-full px-4 py-2 text-[15px] font-medium tracking-[-0.02em]"
            >
              Bid {formatMoney(product.minNextBid)}
            </button>
            {product.dumpCost ? (
              <button
                type="button"
                onClick={onDump}
                disabled={dumping}
                aria-label={
                  dumping
                    ? "Dumping"
                    : `Dump ${product.name} for ${formatMoney(product.dumpCost)}`
                }
                className="btn-fire-soft dump-live w-full px-4 py-2 text-[15px] font-medium tracking-[-0.02em]"
              >
                <DumpFlipLabel
                  cost={product.dumpCost}
                  busy={dumping}
                  busyLabel="Starting…"
                />
              </button>
            ) : null}
          </div>
        </div>
      </article>

      <section className="mt-6">
        <h2 className="mb-3 px-1 text-[15px] font-semibold tracking-[-0.3px] text-fg-strong">
          Bid history
        </h2>
        <BidHistory bids={bids} />
      </section>

      <BidModal
        product={product}
        open={bidOpen}
        onClose={() => setBidOpen(false)}
      />

      <DumpSpotModal
        product={product}
        open={dumpOpen}
        busy={dumping}
        error={dumpError}
        onClose={() => {
          if (dumping) return;
          setDumpOpen(false);
          setDumpError(null);
        }}
        onSubmit={submitDump}
      />
    </div>
  );
}
