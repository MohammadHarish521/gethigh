import type { Product } from "../types";
import { dumpBadge, FloatingBadge } from "./FloatingMedal";
import { ProductCard } from "./ProductCard";

type LeaderboardProps = {
  products: Product[];
  onBid: (product: Product) => void;
  onTakeOne: () => void;
  onDump: (product: Product) => void;
  dumpingId?: string | null;
  flashId?: string | null;
};

export function Leaderboard({
  products,
  onBid,
  onTakeOne,
  onDump,
  dumpingId,
  flashId,
}: LeaderboardProps) {
  if (products.length === 0) {
    return (
      <div className="card flex flex-col items-center px-6 py-12 text-center">
        <FloatingBadge {...dumpBadge} size="lg" glowStrength="soft" />
        <h3 className="mt-4 font-display text-[28px] leading-[1.1] font-extrabold tracking-[-0.04em] text-fg-strong">
          The throne is empty
        </h3>
        <p className="mt-2 max-w-sm text-[16px] leading-[1.4] font-medium tracking-[-0.02em] text-muted">
          $5 takes #1. Then someone dumps you. That’s the whole sport — paste a
          URL above and start it.
        </p>
        <button
          type="button"
          className="btn-fire mt-5"
          onClick={onTakeOne}
        >
          Claim #1
        </button>
      </div>
    );
  }

  const top3 = products.slice(0, 3);
  const top10 = products.slice(3, 10);
  const rest = products.slice(10);

  return (
    <div className="flex flex-col gap-3 sm:gap-[14px]">
      <Divider label="Top 3" />
      {top3.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          onBid={onBid}
          onTakeOne={onTakeOne}
          onDump={onDump}
          dumping={dumpingId === product.id}
          highlighted={flashId === product.id}
          featured
          density={index === 0 ? "hero" : "featured"}
        />
      ))}
      {top10.length > 0 ? (
        <>
          <Divider label="Top 10" />
          {top10.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              onBid={onBid}
              onTakeOne={onTakeOne}
              onDump={onDump}
              dumping={dumpingId === product.id}
              highlighted={flashId === product.id}
              density="row"
              striped={index % 2 === 1}
            />
          ))}
        </>
      ) : null}
      {rest.length > 0 ? (
        <>
          <Divider label="The rest" />
          {rest.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              onBid={onBid}
              onTakeOne={onTakeOne}
              onDump={onDump}
              dumping={dumpingId === product.id}
              highlighted={flashId === product.id}
              density="row"
              striped={index % 2 === 0}
            />
          ))}
        </>
      ) : null}
      <p className="pt-4 text-center text-[14px] tracking-[-0.26px] text-muted">
        Showing {products.length}{" "}
        {products.length === 1 ? "listing" : "listings"}
      </p>
    </div>
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
