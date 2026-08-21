export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  url: string;
  hostname: string;
  category: string;
  logoUrl: string;
  creatorName: string;
  creatorBio: string;
  creatorId: string | null;
  currentBid: number;
  currentBidAt: string | null;
  bidCount: number;
  minNextBid: number;
  rank: number | null;
  createdAt: string;
};

export type BidHistoryItem = {
  id: string;
  productId?: string;
  amount: number;
  userName: string;
  createdAt: string;
};

export type UserBid = {
  id: string;
  amount: number;
  status: "pending" | "succeeded" | "failed";
  createdAt: string;
  confirmedAt: string | null;
  paymentId: string | null;
  product: {
    id: string;
    name: string;
    logoUrl: string;
    currentBid: number;
    rank: number | null;
  };
};

export type CheckoutResponse = {
  paymentId: string;
  bidId: string;
  checkoutUrl: string;
  mock: boolean;
  productId?: string;
};

export type PaymentStatus = {
  payment: {
    id: string;
    amount: number;
    status: "pending" | "succeeded" | "failed";
    provider: "polar" | "mock";
    createdAt: string;
    processedAt: string | null;
  };
  bid: { id: string; amount: number; status: string } | null;
  product: Product | null;
  becameNumberOne: boolean;
};

export type SortKey = "trending" | "highest" | "newest";
