import { db } from "./db.js";
import { readRawPresence } from "./presence.js";

const DATAFAST_API = "https://datafa.st/api/v1";
const CACHE_MS = 30_000;
const PUBLIC_TRACKING_ID = "dfid_oNzdikU2lkcWAsFr4pFF7";
const DATAFAST_SHARE_URL = "https://datafa.st/share/6a90099434650f40287c17ab";

export type LiveSlice = {
  live: number | null;
  visitors: number | null;
  views: number | null;
  revenue: number | null;
};

export type LiveStats = {
  configured: boolean;
  dashboardUrl: string | null;
  websiteId: string;
  board: LiveSlice;
  datafast: LiveSlice;
  live: number | null;
  visitors: number | null;
  views: number | null;
  revenue: number | null;
  updatedAt: string;
};

type CacheEntry = { at: number; stats: LiveStats };

let cache: CacheEntry | null = null;
let inflight: Promise<LiveStats> | null = null;
let resolvedWebsiteId: string | null = null;

type WebsiteRow = {
  _id?: string;
  domain?: string | null;
  trackingId?: string | null;
};

type DataFastEnvelope<T> = {
  status?: string;
  data?: T;
  error?: unknown;
  message?: unknown;
};

function apiKey() {
  return process.env.DATAFAST_API_KEY?.trim() || "";
}

export function isDataFastLiveConfigured() {
  return apiKey().length > 0;
}

function emptySlice(): LiveSlice {
  return { live: null, visitors: null, views: null, revenue: null };
}

function emptyStats(partial?: Partial<LiveStats>): LiveStats {
  return {
    configured: isDataFastLiveConfigured(),
    dashboardUrl: DATAFAST_SHARE_URL,
    websiteId: PUBLIC_TRACKING_ID,
    board: emptySlice(),
    datafast: emptySlice(),
    visitors: null,
    revenue: null,
    views: null,
    live: null,
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

function asRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function errorText(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  const record = asRecord(value);
  if (!record) return "";
  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }
  if (typeof record.error === "string" && record.error.trim()) {
    return record.error.trim();
  }
  const nested = asRecord(record.error);
  if (typeof nested?.message === "string" && nested.message.trim()) {
    return nested.message.trim();
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function asList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  const record = asRecord(value);
  if (Array.isArray(record?.data)) return record.data as T[];
  return [];
}

function metric(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function asCount(value: unknown, ...keys: string[]) {
  const list = asList<Record<string, unknown>>(value);
  const record = list[0] ?? asRecord(value);
  if (!record) return null;
  return metric(record, ...keys);
}

function asOverview(value: unknown) {
  const list = asList<Record<string, unknown>>(value);
  const record = list[0] ?? asRecord(value);
  if (!record) {
    return { visitors: null, revenue: null, views: null };
  }
  return {
    visitors: metric(record, "visitors"),
    revenue: metric(record, "revenue"),
    views: metric(record, "pageviews", "page_views", "views"),
  };
}

function dashboardUrlFrom() {
  const explicit = process.env.DATAFAST_PUBLIC_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return DATAFAST_SHARE_URL;
}

function listingRevenue() {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM payments
       WHERE status = 'succeeded'`,
    )
    .get() as { total: number };
  return Number(row.total) || 0;
}

async function datafastGet<T>(
  path: string,
  query: Record<string, string> = {},
  options: { needsWebsite?: boolean } = {},
): Promise<T> {
  const key = apiKey();
  const url = new URL(`${DATAFAST_API}${path}`);
  for (const [name, value] of Object.entries(query)) {
    if (value) url.searchParams.set(name, value);
  }
  if (options.needsWebsite !== false && key.startsWith("dft_")) {
    url.searchParams.set("websiteId", await websiteIdForToken());
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });
  const body = (await response.json().catch(() => ({}))) as DataFastEnvelope<T>;
  if (!response.ok) {
    const detail =
      errorText(body.error) ||
      errorText(body.message) ||
      `DataFast ${response.status}`;
    throw new Error(detail);
  }
  return body.data as T;
}

async function websiteIdForToken(): Promise<string> {
  if (resolvedWebsiteId) return resolvedWebsiteId;

  const configured = process.env.DATAFAST_WEBSITE_ID?.trim() || "";
  if (configured && !configured.startsWith("dfid_")) {
    resolvedWebsiteId = configured;
    return resolvedWebsiteId;
  }

  const sites = asList<WebsiteRow>(
    await datafastGet<WebsiteRow[]>("/admin/websites", {}, { needsWebsite: false }),
  );
  const wanted = configured || PUBLIC_TRACKING_ID;
  const match =
    sites.find((site) => site._id === wanted || site.trackingId === wanted) ||
    sites.find((site) =>
      (site.domain || "").toLowerCase().includes("gethigh"),
    ) ||
    (sites.length === 1 ? sites[0] : null);

  if (!match?._id) {
    throw new Error(
      "Account tokens need DATAFAST_WEBSITE_ID. Set it to the DataFast website id, or use a df_ website key.",
    );
  }

  resolvedWebsiteId = match._id;
  return resolvedWebsiteId;
}

async function fetchLiveStats(): Promise<LiveStats> {
  const presence = readRawPresence();
  const listing = listingRevenue();
  const board: LiveSlice = {
    live: presence.live,
    visitors: Math.round(presence.views / 5),
    views: presence.views,
    revenue: listing,
  };

  let overview = { visitors: null as number | null, revenue: null as number | null, views: null as number | null };
  let realtime: number | null = null;

  if (isDataFastLiveConfigured()) {
    const settled = await Promise.allSettled([
      datafastGet<unknown>("/analytics/overview", {
        fields: "visitors,revenue,pageviews",
      }),
      datafastGet<unknown>("/analytics/realtime", { fields: "visitors" }),
    ]);

    if (settled[0].status === "fulfilled") {
      overview = asOverview(settled[0].value);
    } else {
      console.warn(
        "DataFast overview failed:",
        settled[0].reason instanceof Error
          ? settled[0].reason.message
          : settled[0].reason,
      );
    }

    if (settled[1].status === "fulfilled") {
      realtime = asCount(settled[1].value, "visitors", "count");
    } else {
      console.warn(
        "DataFast realtime failed:",
        settled[1].reason instanceof Error
          ? settled[1].reason.message
          : settled[1].reason,
      );
    }
  }

  const datafast: LiveSlice = {
    live: realtime,
    visitors: overview.visitors,
    views: overview.views,
    revenue: overview.revenue,
  };

  const live = datafast.live ?? board.live;
  const visitors = (board.visitors ?? 0) + (datafast.visitors ?? 0);
  const views = Math.max(board.views ?? 0, datafast.views ?? 0);
  const revenue = (board.revenue ?? 0) + (datafast.revenue ?? 0);

  return emptyStats({
    configured: isDataFastLiveConfigured(),
    dashboardUrl: dashboardUrlFrom(),
    websiteId: PUBLIC_TRACKING_ID,
    board,
    datafast,
    live,
    visitors,
    views,
    revenue,
  });
}

export function peekLiveStats(): LiveStats | null {
  return cache?.stats ?? null;
}

export async function getLiveStats(): Promise<LiveStats> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.stats;
  if (inflight) return inflight;

  inflight = fetchLiveStats()
    .then((stats) => {
      cache = { at: Date.now(), stats };
      return stats;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
