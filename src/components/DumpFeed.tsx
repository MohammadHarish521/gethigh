import { Link } from "react-router-dom";
import type { ActivityItem, RecentDump } from "../types";
import { formatMoney, formatTimeAgo } from "../utils/format";
import { DumpFlipLabel } from "./DumpFlipLabel";
import { dumpBadge, FloatingBadge, recentDumpBadge } from "./FloatingMedal";
import { ProductLogo } from "./ProductLogo";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const empty = items.length === 0;

  return (
    <section className="card-sm flex max-h-[min(70vh,640px)] flex-col px-4 py-4">
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
      {empty ? (
        <p className="mt-3 text-[14px] leading-[1.45] font-medium tracking-[-0.02em] text-muted">
          Bids and dumps land here.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5 overflow-y-auto pr-1">
          {items.map((item) => {
            const dumped = item.kind === "dump";
            return (
              <li key={item.id} className="flex items-center gap-2">
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
              </li>
            );
          })}
        </ul>
      )}
    </section>
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

export function DumpFeed({
  dumps,
  activity,
  onDumpTop,
}: {
  dumps: RecentDump[];
  activity: ActivityItem[];
  onDumpTop?: () => void;
}) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2">
      <ActivityFeed items={activity} />
      <RecentDumps dumps={dumps} onDumpTop={onDumpTop} />
    </div>
  );
}
