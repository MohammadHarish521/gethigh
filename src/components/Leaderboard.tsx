import { Link } from "react-router-dom";
import type { Product } from "../types";
import { EmptyState } from "./EmptyState";
import { ProductCard } from "./ProductCard";

type LeaderboardProps = {
  products: Product[];
  onBid: (product: Product) => void;
  flashId?: string | null;
  query?: string;
};

export function Leaderboard({ products, onBid, flashId, query }: LeaderboardProps) {
  if (products.length === 0 && query) {
    return (
      <EmptyState
        icon="search"
        title="No matching products"
        description="Try a different name, category, or website."
      />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon="products"
        title="Nothing on the board yet"
        description="Submit a product with a $1 bid to claim the first spot."
        action={
          <Link to="/submit" className="btn-primary">
            Submit Product
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onBid={onBid}
          highlighted={flashId === product.id}
        />
      ))}
    </div>
  );
}
