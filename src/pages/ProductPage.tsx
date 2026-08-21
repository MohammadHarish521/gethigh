import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BidButton } from "../components/BidButton";
import { BidHistory } from "../components/BidHistory";
import { BidModal } from "../components/BidModal";
import { EmptyState } from "../components/EmptyState";
import { ProductLogo } from "../components/ProductLogo";
import { useStore } from "../store/Store";
import { formatMoney, formatTimeAgo, plural } from "../utils/format";

export function ProductPage() {
  const { id } = useParams();
  const { products, bidsFor, placeBid, flashId } = useStore();
  const [bidOpen, setBidOpen] = useState(false);

  const product = products.find((item) => item.id === id);

  if (!product) {
    return (
      <EmptyState
        icon="search"
        title="Product not found"
        description="It may have been removed, or the link is incorrect."
        action={
          <Link to="/" className="btn-primary">
            Back to explore
          </Link>
        }
      />
    );
  }

  const bids = bidsFor(product.id);

  return (
    <div className="animate-fade-up mx-auto max-w-xl">
      <div
        className={`rounded-2xl border px-5 py-8 sm:px-8 sm:py-10 ${
          product.rank === 1 ? "border-line bg-warm" : "border-line bg-white"
        } ${flashId === product.id ? "animate-rank-flash" : ""}`}
      >
        <ProductLogo src={product.logoUrl} name={product.name} size="lg" />

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
          {product.rank === 1 ? (
            <span className="text-[11px] font-medium uppercase tracking-wide text-accent">
              Top spot
            </span>
          ) : null}
        </div>

        <p className="mt-2 text-[15px] leading-relaxed text-muted">{product.description}</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href={product.url}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
          >
            Visit website
          </a>
          <span className="text-sm text-faint">
            {product.hostname}
            <span className="mx-1.5">·</span>
            {product.category}
          </span>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-page px-4 py-3">
            <div className="text-xs text-muted">Current rank</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              #{product.rank}
            </div>
          </div>
          <div className="rounded-xl border border-line bg-page px-4 py-3">
            <div className="text-xs text-muted">Highest bid</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {formatMoney(product.currentBid)}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <BidButton size="lg" onClick={() => setBidOpen(true)}>
            Bid
          </BidButton>
          <p className="mt-2 text-xs text-muted">
            Next bid from {formatMoney(product.minNextBid)} · {plural(product.bidCount, "bid")}
          </p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium">Bid history</h2>
        <BidHistory bids={bids} />
      </section>

      <section className="mt-10 rounded-2xl border border-line bg-white px-5 py-5">
        <div className="text-xs font-medium uppercase tracking-wide text-muted">Creator</div>
        <div className="mt-2 text-[15px] font-medium">{product.creatorName}</div>
        <p className="mt-1 text-sm leading-relaxed text-muted">{product.creatorBio}</p>
        <p className="mt-3 text-xs text-faint">
          Listed {formatTimeAgo(product.createdAt)}
          {product.currentBidAt ? ` · Leading bid ${formatTimeAgo(product.currentBidAt)}` : ""}
        </p>
      </section>

      <BidModal
        product={product}
        open={bidOpen}
        onClose={() => setBidOpen(false)}
        onConfirm={(amount) => {
          placeBid(product.id, amount);
          setBidOpen(false);
        }}
      />
    </div>
  );
}
