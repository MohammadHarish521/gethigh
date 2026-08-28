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
  LiveStats,
} from "../types";
import { ensureDataFast } from "../lib/datafast";

function apiErrorMessage(data: unknown) {
  if (!data || typeof data !== "object") return "Request failed.";
  const record = data as Record<string, unknown>;
  if (typeof record.error === "string" && record.error.trim()) {
    return record.error.trim();
  }
  if (record.error && typeof record.error === "object") {
    const message = (record.error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }
  return "Request failed.";
}

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
    error?: unknown;
    message?: unknown;
  };

  if (!response.ok) {
    throw new Error(apiErrorMessage(data));
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
      dailyMinBid: number;
      dailyMinRaise: number;
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
  products: (board?: "alltime" | "today") =>
    request<{ products: Product[] }>(
      board === "today" ? "/api/products?board=today" : "/api/products",
    ),
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
    board?: "alltime" | "today";
  }) => checkoutPost<CheckoutResponse>("/api/products", input),
  createBid: (productId: string, amount: number) =>
    checkoutPost<CheckoutResponse>("/api/bids", { productId, amount }),
  createDump: (productId: string, url: string) =>
    checkoutPost<CheckoutResponse>("/api/dumps", { productId, url }),
  recentDumps: (board?: "alltime" | "today") =>
    request<{ dumps: RecentDump[] }>(
      board === "today" ? "/api/dumps?board=today" : "/api/dumps",
    ),
  recentActivity: (board?: "alltime" | "today") =>
    request<{ activity: ActivityItem[] }>(
      board === "today" ? "/api/activity?board=today" : "/api/activity",
    ),
  sponsors: () =>
    request<{ seats: SponsorSeat[]; price: number }>("/api/sponsors"),
  createSponsor: (slot: string, url: string) =>
    checkoutPost<CheckoutResponse>("/api/sponsors", { slot, url }),
  bike: () => request<BikeAuction>("/api/bike"),
  live: () => request<LiveStats>("/api/live"),
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
