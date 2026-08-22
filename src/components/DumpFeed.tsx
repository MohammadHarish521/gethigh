import { Link } from "react-router-dom";
import type { RecentDump } from "../types";
import { formatMoney } from "../utils/format";
import { dumpBadge, FloatingBadge, recentDumpBadge } from "./FloatingMedal";
import { ProductLogo } from "./ProductLogo";

export function DumpExplainer() {
  return (
    <section className="card-sm flex items-start gap-3 px-4 py-4">
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold tracking-[-0.03em] text-fg-strong">
          Dump
        </h2>
        <p className="mt-1 text-[14px] leading-[1.45] font-medium tracking-[-0.02em] text-muted">
          Pay their bid. They hit $0 and last place. That’s the sport.
        </p>
      </div>
      <FloatingBadge {...dumpBadge} glowStrength="soft" />
    </section>
  );
}

export function RecentDumps({ dumps }: { dumps: RecentDump[] }) {
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
            First dump writes the lore. Knock #1 to $0 and take the kill card.
          </p>
          <button
            type="button"
            className="btn-fire mt-4 w-full text-[15px]"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Dump #1
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

export function DumpFeed({ dumps }: { dumps: RecentDump[] }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2">
      <DumpExplainer />
      <RecentDumps dumps={dumps} />
    </div>
  );
}
