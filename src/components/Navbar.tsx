import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { api } from "../api/client";
import { formatMoney, plural } from "../utils/format";

export function Navbar() {
  const [revenue, setRevenue] = useState<number | null>(null);
  const [clicks, setClicks] = useState<number | null>(null);

  useEffect(() => {
    api
      .config()
      .then((config) => {
        if (config.revenue > 0) setRevenue(config.revenue);
        setClicks(config.clicks ?? 0);
      })
      .catch(() => {
        setRevenue(null);
        setClicks(null);
      });
  }, []);

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="mx-auto flex w-full max-w-[792px] items-center justify-between gap-2 rounded-full bg-bg/85 py-[5px] pr-[5px] pl-4 backdrop-blur-md sm:pl-[23px]">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link to="/" className="flex shrink-0 items-center gap-1.5">
            <span className="font-display text-[20px] font-extrabold tracking-[-0.06em] text-fg-strong sm:text-[22px]">
              gethigh
            </span>
            <span className="rounded-full border-2 border-[#ffd7b0] bg-gradient-to-b from-[#ffb36a] to-[#df5c0f] px-2 py-0.5 text-[11px] font-semibold tracking-[-0.2px] text-white shadow-[0_4px_12px_rgb(223_92_15/0.3)] sm:text-[12px]">
              dump
            </span>
          </Link>
          {revenue != null || clicks != null ? (
            <span
              className="hidden min-w-0 items-center gap-1 truncate whitespace-nowrap text-[14px] text-muted md:inline-flex"
              aria-live="polite"
            >
              {revenue != null ? (
                <>
                  made{" "}
                  <b className="num font-bold text-green">{formatMoney(revenue)}</b>
                </>
              ) : null}
              {revenue != null && clicks != null ? (
                <span className="text-faint" aria-hidden="true">
                  ·
                </span>
              ) : null}
              {clicks != null ? (
                <b className="num font-bold text-fg">
                  {plural(clicks, "click")}
                </b>
              ) : null}
            </span>
          ) : null}
        </div>
        <nav className="flex shrink-0 items-center" aria-label="Main">
          <NavLink to="/" className={navClass} end>
            <span className="sm:hidden">Board</span>
            <span className="hidden sm:inline">Leaderboard</span>
          </NavLink>
          <NavLink to="/bike" className={navClass}>
            Bike
          </NavLink>
          <NavLink to="/how-it-works" className={navClass}>
            How it works
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-full px-2.5 py-2 text-[14px] leading-none font-medium whitespace-nowrap transition sm:px-3.5 sm:py-4 sm:text-[16px] ${
    isActive ? "font-bold text-fg-strong" : "text-muted hover:text-fg"
  }`;
}
