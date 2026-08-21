import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Product } from "../types";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const data = await api.products();
    setProducts(data.products);
  }, []);

  useEffect(() => {
    refresh()
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load products.");
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  return { products, loading, error, refresh };
}
