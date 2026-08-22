import { isPrivateHost } from "./listingMeta.js";

const FETCH_MS = 3500;
const TOTAL_MS = 8000;
const MAX_BYTES = 1_500_000;
const CACHE_MS = 6 * 60 * 60 * 1000;
const MISS_MS = 5 * 60 * 1000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

type IconFile = { type: string; body: Buffer };

const cache = new Map<string, { expires: number; icon: IconFile | null }>();

export async function fetchSiteIcon(pageUrl: string): Promise<IconFile | null> {
  const parsed = parsePageUrl(pageUrl);
  if (!parsed) return null;

  const key = `${parsed.protocol}//${parsed.hostname}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.icon;

  try {
    const icon = await resolveIcon(parsed);
    cache.set(key, {
      expires: Date.now() + (icon ? CACHE_MS : MISS_MS),
      icon,
    });
    return icon;
  } catch {
    cache.set(key, { expires: Date.now() + MISS_MS, icon: null });
    return null;
  }
}

function parsePageUrl(pageUrl: string) {
  const raw = pageUrl.trim();
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    try {
      parsed = new URL(`https://${raw}`);
    } catch {
      return null;
    }
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (isPrivateHost(parsed.hostname)) return null;
  return parsed;
}

async function resolveIcon(page: URL): Promise<IconFile | null> {
  const deadline = Date.now() + TOTAL_MS;
  const candidates: string[] = [];

  const html = await fetchText(page.toString(), deadline);
  if (html) {
    for (const href of iconHrefs(html, page)) {
      const data = fromDataUri(href);
      if (data) return data;
      candidates.push(href);
    }
  }

  const origin = page.origin;
  candidates.push(
    `${origin}/apple-touch-icon.png`,
    `${origin}/apple-touch-icon-precomposed.png`,
    `${origin}/favicon.png`,
    `${origin}/favicon.svg`,
    `${origin}/favicon.webp`,
    `${origin}/favicon.jpg`,
    `${origin}/favicon.jpeg`,
    `${origin}/favicon.gif`,
    `${origin}/favicon.ico`,
    `${origin}/icon.png`,
    `${origin}/icon.svg`,
    `${origin}/icon.webp`,
    `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(page.hostname)}`,
    `https://icons.duckduckgo.com/ip3/${page.hostname}.ico`,
  );

  const seen = new Set<string>();
  for (const href of candidates) {
    if (Date.now() > deadline) break;
    if (seen.has(href)) continue;
    seen.add(href);
    const file = await fetchImage(href, deadline);
    if (file) return file;
  }
  return null;
}

function iconHrefs(html: string, base: URL) {
  const found: Array<{ href: string; score: number }> = [];

  for (const tag of extractLinkTags(html)) {
    const attrs = parseAttrs(tag);
    const rel = (attrs.rel || "").toLowerCase();
    if (!rel.includes("icon")) continue;
    const href = attrs.href?.trim();
    if (!href) continue;
    let absolute: string;
    try {
      absolute = href.startsWith("data:") ? href : new URL(href, base).toString();
    } catch {
      continue;
    }
    found.push({
      href: absolute,
      score: iconScore(rel, attrs.type || "", attrs.sizes || "", href),
    });
  }

  found.sort((a, b) => b.score - a.score);
  return found.map((item) => item.href);
}

function extractLinkTags(html: string) {
  const tags: string[] = [];
  const startRe = /<link\b/gi;
  let match: RegExpExecArray | null;
  while ((match = startRe.exec(html))) {
    const end = endOfTag(html, match.index);
    if (end > match.index) tags.push(html.slice(match.index, end));
  }
  return tags;
}

function endOfTag(html: string, start: number) {
  let quote: '"' | "'" | null = null;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ">") return i + 1;
  }
  return html.length;
}

function iconScore(rel: string, type: string, sizes: string, href: string) {
  const hay = `${type} ${href}`.toLowerCase();
  let score = 0;
  if (rel.includes("apple-touch")) score += 40;
  const size = Math.max(
    0,
    ...[...sizes.matchAll(/(\d+)/g)].map((match) => Number(match[1])),
  );
  if (sizes.toLowerCase() === "any") score += 30;
  if (size) score += Math.min(size, 512) / 8;
  if (hay.includes(".png") || hay.includes("image/png")) score += 28;
  if (hay.includes(".webp") || hay.includes("image/webp")) score += 24;
  if (hay.includes(".svg") || hay.includes("svg+xml")) score += 22;
  if (hay.includes(".jpg") || hay.includes(".jpeg") || hay.includes("image/jpeg"))
    score += 18;
  if (hay.includes(".gif") || hay.includes("image/gif")) score += 12;
  if (hay.includes(".avif") || hay.includes("image/avif")) score += 20;
  if (/\.ico(\?|$)/.test(hay) || hay.includes("image/x-icon") || hay.includes("image/vnd.microsoft.icon"))
    score += 6;
  return score;
}

function parseAttrs(tag: string) {
  const attrs: Record<string, string> = {};
  const pattern = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of tag.matchAll(pattern)) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function fromDataUri(href: string): IconFile | null {
  if (!/^data:/i.test(href)) return null;
  const comma = href.indexOf(",");
  if (comma < 5) return null;
  const parts = href.slice(5, comma).split(";").map((part) => part.trim());
  const mime = (parts[0] || "").toLowerCase();
  if (!mime.startsWith("image/")) return null;
  const isB64 = parts.some((part) => part.toLowerCase() === "base64");
  const payload = href.slice(comma + 1);
  try {
    let body: Buffer;
    if (isB64) {
      body = Buffer.from(payload.replace(/\s/g, ""), "base64");
    } else {
      let text = payload;
      try {
        text = decodeURIComponent(payload);
      } catch {
        text = payload;
      }
      body = Buffer.from(text, "utf8");
    }
    if (body.byteLength < 8 || body.byteLength > MAX_BYTES) return null;
    const type = mime.startsWith("image/svg") ? "image/svg+xml" : mime;
    return { type, body };
  } catch {
    return null;
  }
}

async function fetchText(url: string, deadline: number) {
  try {
    const response = await get(url, "text/html,application/xhtml+xml", deadline);
    if (!response) return null;
    const type = response.headers.get("content-type") || "";
    if (type && !/html|xml/i.test(type)) return null;
    return (await response.text()).slice(0, 160_000);
  } catch {
    return null;
  }
}

async function fetchImage(url: string, deadline: number): Promise<IconFile | null> {
  const parsed = parsePageUrl(url);
  if (!parsed && !url.startsWith("data:")) return null;
  if (url.startsWith("data:")) return fromDataUri(url);

  try {
    const response = await get(
      url,
      "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      deadline,
    );
    if (!response) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) return null;
    const type = sniffType(buffer, response.headers.get("content-type") || "");
    if (!type) return null;
    const min = type === "image/svg+xml" ? 8 : 16;
    if (buffer.byteLength < min) return null;
    return { type, body: buffer };
  } catch {
    return null;
  }
}

async function get(url: string, accept: string, deadline: number, hops = 0): Promise<Response | null> {
  const remain = deadline - Date.now();
  if (remain <= 0 || hops > 5) return null;

  const parsed = parsePageUrl(url);
  if (!parsed) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(FETCH_MS, remain));
  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "manual",
      headers: {
        accept,
        "user-agent": UA,
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      const next = new URL(location, parsed);
      return get(next.toString(), accept, deadline, hops + 1);
    }
    if (!response.ok) return null;
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function sniffType(body: Buffer, headerType: string) {
  const header = headerType.split(";")[0]?.trim().toLowerCase() || "";
  if (body.length >= 8 && body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47)
    return "image/png";
  if (body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff)
    return "image/jpeg";
  if (body.length >= 6 && body.subarray(0, 6).toString("ascii").startsWith("GIF8"))
    return "image/gif";
  if (
    body.length >= 12 &&
    body.subarray(0, 4).toString("ascii") === "RIFF" &&
    body.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  if (body.length >= 12 && body.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = body.subarray(8, 12).toString("ascii");
    if (brand.startsWith("avif") || brand.startsWith("avis") || brand.startsWith("mif1"))
      return "image/avif";
  }
  if (body.length >= 2 && body[0] === 0x42 && body[1] === 0x4d) return "image/bmp";
  if (body.length >= 4 && body[0] === 0x00 && body[1] === 0x00 && body[2] === 0x01 && body[3] === 0x00)
    return "image/x-icon";
  if (body.length >= 4 && body[0] === 0x00 && body[1] === 0x00 && body[2] === 0x02 && body[3] === 0x00)
    return "image/x-icon";
  const start = body.subarray(0, 256).toString("utf8").trimStart();
  if (start.startsWith("<svg") || (start.startsWith("<?xml") && /<svg[\s>]/i.test(start)))
    return "image/svg+xml";
  if (
    header.startsWith("image/png") ||
    header.startsWith("image/jpeg") ||
    header.startsWith("image/gif") ||
    header.startsWith("image/webp") ||
    header.startsWith("image/avif") ||
    header.startsWith("image/svg") ||
    header.startsWith("image/x-icon") ||
    header.startsWith("image/vnd.microsoft.icon") ||
    header.startsWith("image/bmp")
  ) {
    return header === "image/vnd.microsoft.icon" ? "image/x-icon" : header;
  }
  return null;
}
