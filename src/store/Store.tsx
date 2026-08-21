import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { makeLogo, mockBids, mockProducts, rankProducts } from "../data/mock";
import type { BidHistoryItem, Product } from "../types";
import { hostnameFromUrl, slugify } from "../utils/format";

export type SubmitProductInput = {
  name: string;
  description: string;
  url: string;
  logoUrl: string;
  startingBid: number;
};

type Toast = {
  id: number;
  message: string;
};

type StoreValue = {
  products: Product[];
  bids: BidHistoryItem[];
  flashId: string | null;
  toast: Toast | null;
  placeBid: (productId: string, amount: number) => void;
  submitProduct: (input: SubmitProductInput) => Product;
  bidsFor: (productId: string) => BidHistoryItem[];
  dismissToast: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [bids, setBids] = useState<BidHistoryItem[]>(mockBids);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  const placeBid = useCallback(
    (productId: string, amount: number) => {
      setProducts((current) =>
        rankProducts(
          current.map((product) =>
            product.id === productId
              ? {
                  ...product,
                  currentBid: amount,
                  currentBidAt: new Date().toISOString(),
                  bidCount: product.bidCount + 1,
                  minNextBid: amount + 1,
                }
              : product,
          ),
        ),
      );
      setBids((current) => [
        {
          id: `bid-${Date.now()}`,
          productId,
          amount,
          userName: "You",
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setFlashId(productId);
      window.setTimeout(() => setFlashId(null), 1200);

      const nextRank =
        rankProducts(
          products.map((product) =>
            product.id === productId
              ? { ...product, currentBid: amount }
              : product,
          ),
        ).find((product) => product.id === productId)?.rank ?? null;

      const name = products.find((product) => product.id === productId)?.name;
      if (nextRank === 1) {
        showToast(`${name ?? "This product"} is now #1.`);
      } else {
        showToast(`Bid placed on ${name ?? "this product"}.`);
      }
    },
    [products, showToast],
  );

  const submitProduct = useCallback(
    (input: SubmitProductInput) => {
      const idBase = slugify(input.name) || "product";
      const id = products.some((product) => product.id === idBase)
        ? `${idBase}-${Date.now().toString().slice(-4)}`
        : idBase;

      const created: Product = {
        id,
        name: input.name.trim(),
        description: input.description.trim(),
        url: input.url.trim(),
        hostname: hostnameFromUrl(input.url.trim()),
        category: "New",
        logoUrl: input.logoUrl || makeLogo(input.name),
        creatorName: "You",
        creatorBio: "Listed on BidTop.",
        creatorId: "you",
        currentBid: input.startingBid,
        currentBidAt: new Date().toISOString(),
        bidCount: 1,
        minNextBid: input.startingBid + 1,
        rank: null,
        createdAt: new Date().toISOString(),
      };

      setProducts((current) => rankProducts([created, ...current]));
      setBids((current) => [
        {
          id: `bid-${id}-start`,
          productId: id,
          amount: input.startingBid,
          userName: "You",
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setFlashId(id);
      window.setTimeout(() => setFlashId(null), 1200);
      showToast(`${created.name} is on the board.`);
      return created;
    },
    [products, showToast],
  );

  const bidsFor = useCallback(
    (productId: string) =>
      bids
        .filter((bid) => bid.productId === productId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [bids],
  );

  const value = useMemo<StoreValue>(
    () => ({
      products,
      bids,
      flashId,
      toast,
      placeBid,
      submitProduct,
      bidsFor,
      dismissToast: () => setToast(null),
    }),
    [products, bids, flashId, toast, placeBid, submitProduct, bidsFor],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
}
