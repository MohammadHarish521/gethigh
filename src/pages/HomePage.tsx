import { useMemo, useState } from "react";
import { BidModal } from "../components/BidModal";
import { FilterBar } from "../components/FilterBar";
import { Leaderboard } from "../components/Leaderboard";
import { useStore } from "../store/Store";
import type { Product, SortKey } from "../types";

export function HomePage() {
  const { products, flashId, placeBid } = useStore();
  const [sort, setSort] = useState<SortKey>("highest");
  const [query, setQuery] = useState("");
  const [bidProduct, setBidProduct] = useState<Product | null>(null);

  const visible = useMemo(
    () => sortProducts(products, sort, query),
    [products, sort, query],
  );

  return (
    <div className="animate-fade-up">
      <section className="mb-10 max-w-xl">
        <h1 className="text-[32px] font-semibold tracking-tight sm:text-4xl">
          Bid your way to the top.
        </h1>
        <p className="mt-2 text-[15px] text-muted sm:text-base">
          The highest bid gets the top spot.
        </p>
      </section>

      <FilterBar sort={sort} onSort={setSort} query={query} onQuery={setQuery} />

      <Leaderboard
        products={visible}
        onBid={setBidProduct}
        flashId={flashId}
        query={query}
      />

      <BidModal
        product={bidProduct}
        open={Boolean(bidProduct)}
        onClose={() => setBidProduct(null)}
        onConfirm={(amount) => {
          if (!bidProduct) return;
          placeBid(bidProduct.id, amount);
          setBidProduct(null);
        }}
      />
    </div>
  );
}

function sortProducts(products: Product[], sort: SortKey, query: string) {
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? products.filter((product) =>
        [product.name, product.description, product.category, product.hostname]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : products;

  const next = [...filtered];
  if (sort === "newest") {
    next.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } else if (sort === "trending") {
    next.sort((a, b) => trendingScore(b) - trendingScore(a));
  } else {
    next.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  }
  return next;
}

function trendingScore(product: Product) {
  const hours = product.currentBidAt
    ? Math.max(1, (Date.now() - new Date(product.currentBidAt).getTime()) / 3_600_000)
    : 48;
  return product.bidCount * 4 + product.currentBid / 25 - hours;
}
