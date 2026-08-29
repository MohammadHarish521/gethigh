import { initDataFast, type DataFastWeb } from "datafast";

/** Public website ID from DataFast → Website Settings. Not a secret. */
export const DATAFAST_WEBSITE_ID = "dfid_oNzdikU2lkcWAsFr4pFF7";

/** Public DataFast dashboard. Website Settings → General → Public Dashboard. */
export const DATAFAST_SHARE_URL =
  "https://datafa.st/share/6a90099434650f40287c17ab";

let client: DataFastWeb | null = null;
let pending: Promise<DataFastWeb | null> | null = null;

/**
 * Starts the DataFast SDK once. That writes the `datafast_visitor_id` cookie
 * Dodo needs for revenue attribution.
 */
export function bootDataFast() {
  if (typeof window === "undefined") return pending;
  if (client) return Promise.resolve(client);
  if (pending) return pending;

  pending = initDataFast({
    websiteId: DATAFAST_WEBSITE_ID,
    autoCapturePageviews: true,
    allowLocalhost: import.meta.env.DEV,
  })
    .then((next) => {
      client = next;
      return next;
    })
    .catch((error) => {
      console.warn("DataFast failed to start", error);
      pending = null;
      return null;
    });

  return pending;
}

/** Wait until the visitor cookie exists (or init gave up) before checkout. */
export async function ensureDataFast() {
  const analytics = await bootDataFast();
  if (analytics) await analytics.flush().catch(() => undefined);
  return analytics;
}
