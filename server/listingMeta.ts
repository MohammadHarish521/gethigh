const FETCH_MS = 3500;
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 220;

export type ListingMeta = {
  title: string | null;
  description: string | null;
};

export function isPlaceholderDescription(description: string) {
  return /^listed from\s/i.test(description.trim());
}

export async function fetchListingMeta(url: string): Promise<ListingMeta> {
  const empty: ListingMeta = { title: null, description: null };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return empty;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return empty;
  if (isPrivateHost(parsed.hostname)) return empty;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_MS);

  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent":
          "Mozilla/5.0 (compatible; gethigh/1.0; +https://gethigh.app)",
      },
    });
    if (!response.ok) return empty;
    const html = (await response.text()).slice(0, 120_000);
    const title = cleanTitle(
      meta(html, ["og:title", "twitter:title"]) || pageTitle(html),
    );
    const description = cleanText(
      meta(html, ["og:description", "twitter:description", "description"]),
      DESCRIPTION_MAX,
    );
    return { title, description };
  } catch {
    return empty;
  } finally {
    clearTimeout(timer);
  }
}

export function isPrivateHost(host: string) {
  const name = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    name === "localhost" ||
    name.endsWith(".localhost") ||
    name === "::1" ||
    name === "0.0.0.0"
  ) {
    return true;
  }
  if (/^127\./.test(name) || /^10\./.test(name) || /^192\.168\./.test(name)) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(name)) return true;
  if (/^169\.254\./.test(name)) return true;
  return false;
}

function meta(html: string, keys: string[]) {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)["']`,
        "i",
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${escaped}["']`,
        "i",
      ),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return decode(match[1]);
    }
  }
  return null;
}

function pageTitle(html: string) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ? decode(match[1]) : null;
}

function cleanTitle(value: string | null) {
  if (!value) return null;
  const first = value.split(/\s[|\-–—]\s/)[0] ?? value;
  return cleanText(first, TITLE_MAX);
}

function cleanText(value: string | null, max: number) {
  if (!value) return null;
  const text = decode(value).replace(/\s+/g, " ").trim();
  if (text.length < 8) return null;
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function decode(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(Number.parseInt(n, 16)),
    );
}
