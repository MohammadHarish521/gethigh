import { Pointer } from "lucide-react";
import { useEffect, useState } from "react";
import type { Product } from "../types";
import {
  formatMoney,
  formatTimeAgo,
  outboundPath,
  plural,
} from "../utils/format";
import { RankBadge } from "./FloatingMedal";
import { ProductLogo } from "./ProductLogo";
import { RankNumber } from "./RankNumber";

type ProductCardProps = {
  product: Product;
  onBid: (product: Product) => void;
  onTakeOne?: () => void;
  onDump: (product: Product) => void;
  dumping?: boolean;
  highlighted?: boolean;
  featured?: boolean;
  density?: "hero" | "featured" | "row";
  striped?: boolean;
};

export function ProductCard({
  product,
  onBid,
  onTakeOne,
  onDump,
  dumping,
  highlighted,
  featured,
  density = "row",
  striped,
}: ProductCardProps) {
  const dumpCost = product.dumpCost;
  const rank = product.rank;
  const isHero = density === "hero";
  const isFeatured = density === "featured" || featured;
  const [clicks, setClicks] = useState(product.clickCount ?? 0);

  useEffect(() => {
    setClicks(product.clickCount ?? 0);
  }, [product.clickCount]);

  function visitSite() {
    setClicks((count) => count + 1);
    window.open(outboundPath(product.id), "_blank", "noopener,noreferrer");
  }

  const rankSkin =
    rank === 1
      ? "card-rank-1"
      : rank === 2
        ? "card-rank-2"
        : rank === 3
          ? "card-rank-3"
          : striped
            ? "card-stripe"
            : "";

  return (
    <article
      className={`card card-hover flex w-full cursor-pointer items-center gap-3.5 px-3.5 py-3.5 sm:gap-4 sm:px-5 ${
        isHero ? "sm:py-5" : "sm:py-4"
      } ${rankSkin} ${highlighted ? "animate-rank-flash" : ""}`}
      onClick={visitSite}
    >
      <div className="shrink-0">
        <ProductLogo
          src={product.logoUrl}
          name={product.name}
          siteUrl={product.url}
          size={isHero ? "lg" : "md"}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline gap-2">
          <RankNumber rank={product.rank} />
          <span
            title={product.url}
            className={`min-w-0 truncate font-medium tracking-[-0.04em] text-fg-strong ${
              isHero
                ? "text-[28px] leading-[1.15] sm:text-[30px]"
                : "text-[26px] leading-[1.2]"
            }`}
          >
            {product.name}
          </span>
        </div>

        <p
          className={`mt-1 text-[16px] leading-[1.4] font-medium tracking-[-0.02em] text-muted ${
            density === "row" ? "line-clamp-1" : "line-clamp-2"
          }`}
        >
          {product.description}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
          <span
            className={`display-num mr-1 leading-none ${isHero ? "text-[26px]" : "text-[22px]"}`}
          >
            {formatMoney(product.currentBid)}
          </span>
          {dumpCost ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDump(product);
              }}
              disabled={dumping}
              className={
                isHero || isFeatured
                  ? "btn-fire px-4 py-2 text-[15px] font-medium tracking-[-0.02em]"
                  : "btn-fire-soft font-medium tracking-[-0.02em]"
              }
            >
              {dumping ? "Dumping…" : "Dump"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (onTakeOne) onTakeOne();
              else onBid(product);
            }}
            className="btn-ghost px-3 py-1.5 text-[13px] font-medium tracking-[-0.02em]"
          >
            Take #1
          </button>
          <span className="ml-auto flex min-w-0 items-center gap-2">
            <span className="chip-clicks-blue shrink-0">
              <Pointer size={14} strokeWidth={2.4} aria-hidden="true" />
              {plural(clicks, "click")}
            </span>
            <span className="shrink-0 text-[13px] font-medium tracking-[-0.02em] text-muted">
              {plural(product.bidCount, "bid")}
            </span>
            {product.currentBidAt ? (
              <>
                <span className="text-muted" aria-hidden="true">
                  ·
                </span>
                <time className="truncate text-[13px] font-medium tracking-[-0.02em] text-muted">
                  {formatTimeAgo(product.currentBidAt)}
                </time>
              </>
            ) : null}
          </span>
        </div>
      </div>

      {isFeatured || isHero ? <RankBadge rank={product.rank} /> : null}
    </article>
  );
}
