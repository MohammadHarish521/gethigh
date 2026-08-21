import type { Product } from "../types";
import { ProductCard } from "./ProductCard";

type ProductListProps = {
  products: Product[];
  onBid: (product: Product) => void;
};

export function ProductList({ products, onBid }: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line bg-white px-4 py-12 text-center text-sm text-muted">
        No products yet. Be the first to submit one.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onBid={onBid} />
      ))}
    </div>
  );
}
