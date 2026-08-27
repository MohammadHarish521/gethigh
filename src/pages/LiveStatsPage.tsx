import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { formatMoney } from "../utils/format";
import type { LiveStats } from "../types";

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
          Live
        </span>
        <span>All time</span>
      </div>

      <h1 className="font-display mt-5 text-[40px] leading-[0.98] font-extrabold tracking-[-0.06em] text-fg sm:text-[64px]">
        The <span className="dump-word">numbers</span>.
      </h1>
      <p className="mx-auto mt-3 max-w-[520px] text-[16px] leading-[1.4] font-medium tracking-[-0.36px] text-muted sm:text-[18px]">
        Visitors, listing revenue, and views.
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
        <div className="mx-auto mt-8 grid max-w-[560px] grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Visitors" value={formatCount(stats.visitors)} />
          <Stat
            label="Total revenue"
            value={formatMoney(stats.revenue ?? 0)}
          />
          <Stat label="Views" value={formatCount(stats.views)} />
        </div>
      )}

      <p className="mx-auto mt-10 max-w-[460px] text-[13px] leading-[1.45] font-medium tracking-[-0.02em] text-muted">
        <Link to="/bike" className="text-accent hover:underline">
          Take a tank spot →
        </Link>
      </p>
    </div>
  );
}

function formatCount(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("en-US");
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-5 text-left">
      <p className="text-[12px] font-medium tracking-[-0.02em] text-muted">
        {label}
      </p>
      <p className="display-num mt-1 text-[32px] sm:text-[28px] md:text-[32px]">
        {value}
      </p>
    </div>
  );
}
