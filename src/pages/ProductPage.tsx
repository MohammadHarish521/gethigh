import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { BidHistory } from "../components/BidHistory";
import { EmptyState } from "../components/EmptyState";
import { RankBadge } from "../components/FloatingMedal";
import { ProductLogo } from "../components/ProductLogo";
import type { BidHistoryItem, Product } from "../types";
import { formatMoney, formatTimeAgo, outboundPath, plural } from "../utils/format";

export function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [bids, setBids] = useState<BidHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dumping, setDumping] = useState(false);
  const [dumpError, setDumpError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .product(id)
      .then((data) => {
        setProduct(data.product);
        setBids(data.bids);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Product not found.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function onDump() {
    if (!product) return;
    setDumpError(null);
    setDumping(true);
    try {
      const checkout = await api.createDump(product.id);
      window.location.href = checkout.checkoutUrl;
    } catch (err: unknown) {
      setDumpError(
        err instanceof Error ? err.message : "Could not start that dump.",
      );
      setDumping(false);
    }
  }

  if (loading)
    return <div className="card mx-auto h-64 max-w-[640px] animate-pulse" />;

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

  return (
    <div className="animate-fade-up mx-auto max-w-[640px]">
      <section
        className={`card relative px-6 py-8 text-center sm:px-10 ${
          product.rank != null && product.rank <= 3 ? "pr-24 sm:pr-32" : ""
        } ${
          product.rank === 1
            ? "card-rank-1"
            : product.rank === 2
              ? "card-rank-2"
              : product.rank === 3
                ? "card-rank-3"
                : ""
        }`}
      >
        {product.rank != null && product.rank <= 3 ? (
          <div className="absolute top-5 right-5 sm:top-6 sm:right-6">
            <RankBadge rank={product.rank} />
          </div>
        ) : null}
        <div className="text-[19px] font-semibold tracking-[-0.7px] text-fg-strong sm:text-[30px]">
          #{product.rank}
        </div>
        <div className="mt-4 flex justify-center">
          <ProductLogo src={product.logoUrl} name={product.name} siteUrl={product.url} size="lg" />
        </div>
        <h1 className="mt-5 text-[26px] leading-[1.2] font-semibold tracking-[-0.78px] text-fg-strong sm:text-[32px]">
          {product.name}
        </h1>
        <p className="mt-2 text-[15px] leading-[1.4] font-medium tracking-[-0.32px] text-muted">
          {product.description}
        </p>
        <a
          href={outboundPath(product.id)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-[14px] text-muted hover:text-fg hover:underline"
        >
          {product.hostname}
        </a>
        <div className="display-num mt-8 text-[44px] sm:text-[68.59px]">
          {formatMoney(product.currentBid)}
        </div>
        <p className="mt-2 text-[14px] tracking-[-0.26px] text-muted">
          {plural(product.bidCount, "bid")}
          {` · ${plural(product.clickCount, "click")}`}
          {product.currentBidAt
            ? ` · ${formatTimeAgo(product.currentBidAt)}`
            : ""}
        </p>
        {dumpError ? (
          <p className="mt-3 text-sm text-red-600">{dumpError}</p>
        ) : null}
        <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            to={`/?url=${encodeURIComponent(product.url)}`}
            className="btn-primary"
          >
            Bid {formatMoney(product.minNextBid)}
          </Link>
          {product.dumpCost ? (
            <button
              type="button"
              onClick={onDump}
              disabled={dumping}
              className="btn-fire"
            >
              {dumping
                ? "Starting…"
                : `Dump · ${formatMoney(product.dumpCost)}`}
            </button>
          ) : null}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 px-1 text-[15px] font-semibold tracking-[-0.3px] text-fg-strong">
          Bid history
        </h2>
        <BidHistory bids={bids} />
      </section>
    </div>
  );
}
