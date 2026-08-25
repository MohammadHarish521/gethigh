import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ActivityItem, Product, RecentDump } from "../types";
import { clicksPerDollar, formatMoney, formatTimeAgo } from "../utils/format";
import { DumpFlipLabel } from "./DumpFlipLabel";
import {
  clicksBadge,
  dumpBadge,
  FloatingBadge,
  recentDumpBadge,
} from "./FloatingMedal";
import { ProductLogo } from "./ProductLogo";

const HOLD_MS = 4000;
const FADE_MS = 260;

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const empty = items.length === 0;
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const leadId = items[0]?.id ?? "";
  const item = items.length ? items[index % items.length] : null;

  useEffect(() => {
    setIndex(0);
    setLeaving(false);
  }, [leadId]);

  useEffect(() => {
    if (empty || items.length <= 1 || paused) return;
    const hold = window.setTimeout(() => setLeaving(true), HOLD_MS);
    return () => window.clearTimeout(hold);
  }, [empty, items.length, index, paused, leadId]);

  useEffect(() => {
    if (!leaving) return;
    const fade = window.setTimeout(() => {
      setIndex((current) =>
        items.length ? (current + 1) % items.length : 0,
      );
      setLeaving(false);
    }, FADE_MS);
    return () => window.clearTimeout(fade);
  }, [leaving, items.length]);

  return (
    <section className="card-sm flex flex-col px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold tracking-[-0.03em] text-fg-strong">
            Live
          </h2>
          {empty ? null : (
            <span className="chip-live mt-1 inline-flex py-0.5 text-[13px]">
              <span
                className="live-dot inline-block h-2 w-2 rounded-full bg-live"
                aria-hidden="true"
              />
              {items.length}
            </span>
          )}
        </div>
        <FloatingBadge {...dumpBadge} glowStrength="soft" />
      </div>
      {empty || !item ? (
        <p className="mt-3 text-[14px] leading-[1.45] font-medium tracking-[-0.02em] text-muted">
          Bids and dumps land here.
        </p>
      ) : (
        <div
          className="mt-3 min-h-[40px] overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <ActivityNotice
            key={item.id}
            item={item}
            leaving={leaving}
            position={index + 1}
            total={items.length}
          />
        </div>
      )}
    </section>
  );
}

function ActivityNotice({
  item,
  leaving,
  position,
  total,
}: {
  item: ActivityItem;
  leaving: boolean;
  position: number;
  total: number;
}) {
  const dumped = item.kind === "dump";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${item.product.name} ${dumped ? "dumped" : "bid"} ${formatMoney(item.amount)}, ${position} of ${total}`}
      className={`flex items-center gap-2 ${
        leaving ? "animate-notify-out" : "animate-notify-in"
      }`}
    >
      <ProductLogo
        src={item.product.logoUrl}
        name={item.product.name}
        siteUrl={item.product.url}
        size="xs"
      />
      <div className="min-w-0 flex-1">
        <Link
          to={`/product/${item.product.id}`}
          className="block truncate text-[14px] font-medium tracking-[-0.02em] text-fg-strong hover:underline"
        >
          {item.product.name}
        </Link>
        <p className="truncate text-[12px] font-medium tracking-[-0.02em] text-muted">
          <span className={dumped ? "text-fire-deep" : "text-accent"}>
            {dumped ? "Dumped" : "Bid"}
          </span>
          {item.createdAt ? (
            <>
              <span aria-hidden="true"> · </span>
              <time>{formatTimeAgo(item.createdAt)}</time>
            </>
          ) : null}
        </p>
      </div>
      <span
        className={`ml-auto shrink-0 text-[12px] font-medium tracking-[-0.02em] ${
          dumped ? "text-fire-deep" : "text-accent"
        }`}
      >
        {formatMoney(item.amount)}
      </span>
    </div>
  );
}

export function RecentDumps({
  dumps,
  onDumpTop,
}: {
  dumps: RecentDump[];
  onDumpTop?: () => void;
}) {
  const empty = dumps.length === 0;

  return (
    <section className="card-sm flex max-h-[min(70vh,640px)] flex-col px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold tracking-[-0.03em] text-fg-strong">
            {empty ? "Open season" : "Recent dumps"}
          </h2>
          {empty ? null : (
            <span className="chip-clicks mt-1 inline-flex py-0.5 text-[13px]">
              {dumps.length}
            </span>
          )}
        </div>
        <FloatingBadge
          {...(empty ? dumpBadge : recentDumpBadge)}
          glowStrength="soft"
        />
      </div>
      {empty ? (
        <>
          <p className="mt-3 text-[14px] leading-[1.45] font-medium tracking-[-0.02em] text-muted">
            First dump writes the lore. Knock them to $0 and take the spot.
          </p>
          <button
            type="button"
            className="btn-fire dump-live mt-4 w-full text-[15px]"
            aria-label={onDumpTop ? "Dump the #1 listing" : "Claim #1"}
            onClick={() => {
              if (onDumpTop) onDumpTop();
              else window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            {onDumpTop ? <DumpFlipLabel /> : "Claim #1"}
          </button>
        </>
      ) : (
        <ul className="mt-3 space-y-2.5 overflow-y-auto pr-1">
          {dumps.slice(0, 8).map((dump) => (
            <li key={dump.id} className="flex items-center gap-2">
              <ProductLogo
                src={dump.product.logoUrl}
                name={dump.product.name}
                siteUrl={dump.product.url}
                size="xs"
              />
              <Link
                to={`/product/${dump.product.id}`}
                className="min-w-0 truncate text-[14px] font-medium tracking-[-0.02em] text-fg-strong hover:underline"
              >
                {dump.product.name}
              </Link>
              <span className="ml-auto shrink-0 text-[12px] font-medium tracking-[-0.02em] text-fire-deep">
                {formatMoney(dump.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function TopClicks({ products }: { products: Product[] }) {
  const top = products.slice(0, 3);
  if (top.length === 0) return null;

  return (
    <section className="card-sm flex flex-col px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold tracking-[-0.03em] text-fg-strong">
            Clicks/$
          </h2>
          <p className="mt-1 text-[12px] font-medium tracking-[-0.02em] text-muted">
            Top 3
          </p>
        </div>
        <FloatingBadge {...clicksBadge} glowStrength="soft" />
      </div>
      <ul className="mt-3 space-y-2.5">
        {top.map((product) => {
          const perDollar = clicksPerDollar(
            product.clickCount ?? 0,
            product.currentBid,
          );
          return (
            <li key={product.id} className="flex items-center gap-2">
              <ProductLogo
                src={product.logoUrl}
                name={product.name}
                siteUrl={product.url}
                size="xs"
              />
              <div className="min-w-0 flex-1">
                <Link
                  to={`/product/${product.id}`}
                  className="block truncate text-[14px] font-medium tracking-[-0.02em] text-fg-strong hover:underline"
                >
                  {product.name}
                </Link>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  {product.rank != null ? (
                    <span className="text-[12px] font-medium tracking-[-0.02em] text-muted">
                      #{product.rank}
                    </span>
                  ) : (
                    <span />
                  )}
                  {perDollar ? (
                    <span
                      title="Clicks generated per dollar on this listing"
                      className="chip-clicks shrink-0 py-0.5 text-[12px]"
                    >
                      <b className="num">{perDollar}</b> clicks/$
                    </span>
                  ) : (
                    <span className="text-[12px] font-medium tracking-[-0.02em] text-muted">
                      —
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function DumpFeed({
  dumps,
  activity,
  products,
  onDumpTop,
}: {
  dumps: RecentDump[];
  activity: ActivityItem[];
  products: Product[];
  onDumpTop?: () => void;
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
      <ActivityFeed items={activity} />
      <div className="flex flex-col gap-3">
        <RecentDumps dumps={dumps} onDumpTop={onDumpTop} />
        <TopClicks products={products} />
      </div>
    </div>
  );
}
