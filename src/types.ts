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
  logoUrl: string;
  creatorName: string;
  creatorId: string | null;
  currentBid: number;
  currentBidAt: string | null;
  bidCount: number;
  minNextBid: number;
  dumpCost: number | null;
  decayPerDay: number;
  rank: number | null;
  clickCount: number;
  createdAt: string;
};

export type BidHistoryItem = {
  id: string;
  amount: number;
  userName: string;
  createdAt: string;
  kind?: "bid" | "dump";
};

export type RecentDump = {
  id: string;
  amount: number;
  rankBefore: number | null;
  heldSeconds: number | null;
  createdAt: string | null;
  product: {
    id: string;
    name: string;
    logoUrl: string;
    url?: string;
  };
};

export type ActivityItem = {
  id: string;
  kind: "bid" | "dump";
  amount: number;
  rankBefore: number | null;
  createdAt: string | null;
  userName: string;
  product: {
    id: string;
    name: string;
    logoUrl: string;
    url?: string;
  };
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
    url?: string;
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
  kind?: "bid" | "dump" | "sponsor";
};

export type SponsorOccupant = {
  name: string;
  url: string;
  logoUrl: string;
};

export type SponsorSeat = {
  slot: string;
  side: "left" | "right";
  index: number;
  occupant: SponsorOccupant | null;
};

export type PaymentStatus = {
  payment: {
    id: string;
    amount: number;
    status: "pending" | "succeeded" | "failed";
    provider: "dodo" | "mock" | "polar";
    createdAt: string;
    processedAt: string | null;
  };
  bid: {
    id: string;
    amount: number;
    status: string;
    kind?: "bid" | "dump" | "sponsor";
    dumpRank?: number | null;
    dumpHeldSeconds?: number | null;
  } | null;
  product: Product | null;
  claimProduct?: Product | null;
  becameNumberOne: boolean;
};
