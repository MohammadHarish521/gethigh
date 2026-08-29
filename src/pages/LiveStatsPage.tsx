import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { DATAFAST_SHARE_URL } from "../lib/datafast";
import { formatMoney } from "../utils/format";
import type { LiveSlice, LiveStats } from "../types";

const POLL_MS = 30_000;

export function LiveStatsPage() {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const next = await api.live();
        if (cancelled) return;
        setStats(next);
        setError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not load live stats.",
        );
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="animate-fade-up mx-auto max-w-[760px] text-center">
      <div className="glass-pill mx-auto inline-flex max-w-full flex-nowrap items-center justify-center gap-x-2 whitespace-nowrap py-[2px] pr-[10px] pl-[3px] text-[13px] tracking-[-0.26px] text-muted sm:gap-x-2.5 sm:pr-[22px]">
        <span className="chip-live-cta">
          <span
            className="live-dot inline-block h-2 w-2 rounded-full"
            aria-hidden="true"
          />
          Total stats
        </span>
        <span>DataFast migration on 28</span>
      </div>

      <h1 className="font-display mt-5 text-[40px] leading-[0.98] font-extrabold tracking-[-0.06em] text-fg sm:text-[64px]">
        The <span className="dump-word">numbers</span>.
      </h1>
      <p className="mx-auto mt-3 max-w-[520px] text-[16px] leading-[1.4] font-medium tracking-[-0.36px] text-muted sm:text-[18px]">
        Heartbeats from this site on the left. DataFast since 28 Aug on the
        right.
      </p>

      {error ? (
        <div className="card mx-auto mt-8 max-w-[520px] px-5 py-8 text-[15px] font-medium text-muted">
          {error}
        </div>
      ) : !stats ? (
        <div className="card mx-auto mt-8 max-w-[520px] px-5 py-8 text-[15px] font-medium text-muted">
          Counting…
        </div>
      ) : (
        <div className="mx-auto mt-8 grid max-w-[720px] gap-4 lg:grid-cols-2">
          <SliceCard
            title="On the board"
            hint="Before DataFast. Heartbeats and listing payments from this server."
            slice={stats.board}
          />
          <SliceCard
            title="DataFast"
            hint="After the DataFast API. Unique visitors, pageviews, and attributed revenue."
            slice={stats.datafast}
            liveLabel="Online now"
            missing={!stats.configured}
            footer={
              stats.configured ? (
                <a
                  href={stats.dashboardUrl || DATAFAST_SHARE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] font-semibold tracking-[-0.02em] text-accent hover:underline"
                >
                  Open live stats on DataFast →
                </a>
              ) : (
                <p className="text-[13px] font-medium tracking-[-0.02em] text-muted">
                  Add a DataFast API key on the server to pull these counts.
                </p>
              )
            }
          />
        </div>
      )}

      <p className="mx-auto mt-10 max-w-[460px] text-[13px] leading-[1.45] font-medium tracking-[-0.02em] text-muted">
        <Link to="/" className="text-accent hover:underline">
          Back to the board →
        </Link>
      </p>
    </div>
  );
}

function SliceCard({
  title,
  hint,
  slice,
  footer,
  missing,
  liveLabel = "Online",
}: {
  title: string;
  hint: string;
  slice: LiveSlice;
  footer?: ReactNode;
  missing?: boolean;
  liveLabel?: string;
}) {
  return (
    <section className="card px-5 py-5 text-left">
      <h2 className="text-[18px] font-semibold tracking-[-0.04em] text-fg-strong">
        {title}
      </h2>
      <p className="mt-1 text-[13px] leading-[1.4] font-medium tracking-[-0.02em] text-muted">
        {hint}
      </p>
      {missing ? (
        <p className="mt-5 text-[15px] font-medium text-muted">Not connected.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label={liveLabel} value={formatCount(slice.live)} />
          <Stat label="Visitors" value={formatCount(slice.visitors)} />
          <Stat label="Views" value={formatCount(slice.views)} />
          <Stat label="Revenue" value={formatMoney(slice.revenue ?? 0)} />
        </div>
      )}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}

function formatCount(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("en-US");
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-3">
      <p className="text-[12px] font-medium tracking-[-0.02em] text-muted">
        {label}
      </p>
      <p className="display-num mt-1 text-[26px] leading-none">{value}</p>
    </div>
  );
}
