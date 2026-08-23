import type {
  CheckoutResponse,
  PaymentStatus,
  Product,
  RecentDump,
  User,
  UserBid,
} from "../types";

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

export const api = {
  config: () => request<{ mockPayments: boolean; minBid: number }>("/api/config"),
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
  }) =>
    request<CheckoutResponse>("/api/products", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createBid: (productId: string, amount: number) =>
    request<CheckoutResponse>("/api/bids", {
      method: "POST",
      body: JSON.stringify({ productId, amount }),
    }),
  createDump: (productId: string, url: string) =>
    request<CheckoutResponse>("/api/dumps", {
      method: "POST",
      body: JSON.stringify({ productId, url }),
    }),
  recentDumps: () => request<{ dumps: RecentDump[] }>("/api/dumps"),
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
