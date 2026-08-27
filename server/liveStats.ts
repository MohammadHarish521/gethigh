import { db } from "./db.js";
import { readPresence } from "./presence.js";

const DATAFAST_API = "https://datafa.st/api/v1";
const CACHE_MS = 30_000;
const PUBLIC_TRACKING_ID = "dfid_oNzdikU2lkcWAsFr4pFF7";

export type LiveStats = {
  configured: boolean;
  visitors: number | null;
  revenue: number | null;
  views: number | null;
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

function emptyStats(partial?: Partial<LiveStats>): LiveStats {
  return {
    configured: isDataFastLiveConfigured(),
    visitors: null,
    revenue: null,
    views: null,
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
  const presence = readPresence();
  const listing = listingRevenue();
  let overview = { visitors: null as number | null, revenue: null as number | null, views: null as number | null };

  if (isDataFastLiveConfigured()) {
    try {
      overview = asOverview(
        await datafastGet<unknown>("/analytics/overview", {
          fields: "visitors,revenue,pageviews",
        }),
      );
    } catch (error) {
      console.warn(
        "DataFast overview failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const boardVisitors = Math.round(presence.views / 5);

  return emptyStats({
    configured: true,
    visitors: boardVisitors + (overview.visitors ?? 0),
    revenue: listing + (overview.revenue ?? 0),
    views: Math.max(presence.views, overview.views ?? 0),
  });
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
