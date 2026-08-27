import type {
  CheckoutResponse,
  PaymentStatus,
  Product,
  RecentDump,
  ActivityItem,
  User,
  UserBid,
  SponsorSeat,
  BikeAuction,
} from "../types";
import { ensureDataFast } from "../lib/datafast";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

async function checkoutPost<T>(path: string, body: unknown): Promise<T> {
  await ensureDataFast();
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export const api = {
  config: () =>
    request<{
      mockPayments: boolean;
      minBid: number;
      minRaise: number;
      minRaisePct: number;
      dumpPremium: number;
      decayPerDay: number;
      revenue: number;
      clicks: number;
    }>("/api/config"),
  presence: () =>
    request<{ live: number; views: number }>("/api/presence", { method: "POST" }),
  me: () => request<{ user: User | null }>("/api/auth/me"),
  login: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    request<{ user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  products: () => request<{ products: Product[] }>("/api/products"),
  product: (id: string) =>
    request<{
      product: Product;
      bids: Array<{ id: string; amount: number; userName: string; createdAt: string }>;
    }>(`/api/products/${id}`),
  submitProduct: (input: {
    name: string;
    description: string;
    url: string;
    logoUrl: string;
    creatorName: string;
    startingBid: number;
  }) => checkoutPost<CheckoutResponse>("/api/products", input),
  createBid: (productId: string, amount: number) =>
    checkoutPost<CheckoutResponse>("/api/bids", { productId, amount }),
  createDump: (productId: string, url: string) =>
    checkoutPost<CheckoutResponse>("/api/dumps", { productId, url }),
  recentDumps: () => request<{ dumps: RecentDump[] }>("/api/dumps"),
  recentActivity: () => request<{ activity: ActivityItem[] }>("/api/activity"),
  sponsors: () =>
    request<{ seats: SponsorSeat[]; price: number }>("/api/sponsors"),
  createSponsor: (slot: string, url: string) =>
    checkoutPost<CheckoutResponse>("/api/sponsors", { slot, url }),
  bike: () => request<BikeAuction>("/api/bike"),
  createBikeSpot: (slot: string, url: string, size: string) =>
    checkoutPost<CheckoutResponse>("/api/bike", { slot, url, size }),
  myBids: () => request<{ bids: UserBid[] }>("/api/me/bids"),
  payment: (id: string) => request<PaymentStatus>(`/api/payments/${id}`),
  mockConfirm: (id: string) =>
    request<{
      paymentId: string;
      status: string;
      becameNumberOne: boolean;
      alreadyProcessed: boolean;
    }>(`/api/payments/${id}/mock-confirm`, { method: "POST" }),
  mockFail: (id: string) =>
    request<{ ok: boolean }>(`/api/payments/${id}/mock-fail`, { method: "POST" }),
};
