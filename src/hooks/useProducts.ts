import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Product } from "../types";
import type { BoardKind } from "../lib/constants";

export function useProducts(board: BoardKind = "alltime") {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const data = await api.products(board);
    setProducts(data.products);
  }, [board]);

  useEffect(() => {
    setLoading(true);
    setProducts([]);
    refresh()
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load products.");
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  return { products, loading, error, refresh };
}
