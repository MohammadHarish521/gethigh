import { Link } from "react-router-dom";
import type { Product } from "../types";
import { formatMoney, plural } from "../utils/format";
import { BidButton } from "./BidButton";
import { ProductLogo } from "./ProductLogo";
import { RankNumber } from "./RankNumber";

type ProductCardProps = {
  product: Product;
  onBid: (product: Product) => void;
  highlighted?: boolean;
};

export function ProductCard({ product, onBid, highlighted }: ProductCardProps) {
  const isTop = product.rank === 1;

  return (
    <article
      className={`rounded-xl border px-3 py-3 transition-all duration-200 sm:px-4 sm:py-3.5 ${
        isTop
          ? "border-line bg-warm shadow-[var(--shadow-card)]"
          : "border-line bg-white"
      } ${highlighted ? "animate-rank-flash" : ""} hover:border-neutral-300 hover:shadow-[var(--shadow-hover)]`}
    >
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <RankNumber rank={product.rank} />

        <Link to={`/product/${product.id}`} className="shrink-0">
          <ProductLogo src={product.logoUrl} name={product.name} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Link
              to={`/product/${product.id}`}
              className="truncate text-[15px] font-medium tracking-tight hover:underline"
            >
              {product.name}
            </Link>
            {isTop ? (
              <span className="hidden text-[11px] font-medium uppercase tracking-wide text-accent sm:inline">
                Top spot
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">{product.description}</p>
          <p className="mt-1 hidden text-xs text-faint sm:block">
            {product.hostname}
            <span className="mx-1.5">·</span>
            {product.category}
            <span className="mx-1.5">·</span>
            {plural(product.bidCount, "bid")}
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-4 sm:flex">
          <div className="text-right">
            <div
              className={`tabular-nums tracking-tight ${
                isTop ? "text-lg font-semibold" : "text-base font-semibold"
              }`}
            >
              {formatMoney(product.currentBid)}
            </div>
          </div>
          <BidButton onClick={() => onBid(product)} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 pl-12 sm:hidden">
        <div className="min-w-0 text-xs text-faint">
          <span className="truncate">{product.category}</span>
          <span className="mx-1.5">·</span>
          {plural(product.bidCount, "bid")}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[15px] font-semibold tabular-nums">
            {formatMoney(product.currentBid)}
          </div>
          <BidButton onClick={() => onBid(product)} />
        </div>
      </div>
    </article>
  );
}
