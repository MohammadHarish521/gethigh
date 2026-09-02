import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { api } from "../api/client";
import { DATAFAST_SHARE_URL } from "../lib/datafast";
import { formatMoney, plural } from "../utils/format";

export function Navbar() {
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-4">
      <div ref={menuRef} className="relative mx-auto w-full max-w-[860px]">
        <div className="flex items-center justify-between rounded-full bg-bg/85 py-[5px] pr-[5px] pl-4 backdrop-blur-md md:pl-[23px]">
          <div className="flex min-w-0 items-center gap-2 md:gap-3">
            <Link to="/" className="flex min-w-0 shrink-0 items-center gap-1.5">
              <span className="font-display text-[20px] font-extrabold tracking-[-0.06em] text-fg-strong md:text-[22px]">
                gethigh
              </span>
              <span className="rounded-full border-2 border-[#ffd7b0] bg-gradient-to-b from-[#ffb36a] to-[#df5c0f] px-2 py-0.5 text-[11px] font-semibold tracking-[-0.2px] text-white shadow-[0_4px_12px_rgb(223_92_15/0.3)] md:text-[12px]">
                dump
              </span>
            </Link>
            {revenue != null || clicks != null ? (
              <span
                className="hidden min-w-0 items-center gap-1 truncate whitespace-nowrap text-[14px] text-muted lg:inline-flex"
                aria-live="polite"
              >
                {revenue != null ? (
                  <>
                    made{" "}
                    <b className="num font-bold text-green">
                      {formatMoney(revenue)}
                    </b>
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

          <button
            type="button"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-fg-strong md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X size={22} strokeWidth={2.2} /> : <Menu size={22} strokeWidth={2.2} />}
          </button>

          <nav className="hidden items-center md:flex" aria-label="Main">
            <NavLinks onNavigate={() => setOpen(false)} />
          </nav>
        </div>

        {open ? (
          <nav
            id="mobile-nav"
            className="absolute top-[calc(100%+8px)] right-0 left-0 z-40 flex flex-col gap-1 rounded-[22px] border border-white/80 bg-bg/95 p-2 shadow-[0_18px_40px_rgb(26_46_63/0.12)] backdrop-blur-md md:hidden"
            aria-label="Main"
          >
            <NavLinks onNavigate={() => setOpen(false)} mobile />
          </nav>
        ) : null}
      </div>
    </header>
  );
}

function NavLinks({
  onNavigate,
  mobile = false,
}: {
  onNavigate: () => void;
  mobile?: boolean;
}) {
  const itemClass = mobile ? mobileNavClass : navClass;

  return (
    <>
      <NavLink to="/bike" className={itemClass} onClick={onNavigate}>
        Bike
      </NavLink>
      <NavLink to="/live" className={itemClass} onClick={onNavigate}>
        Total stats
      </NavLink>
      <a
        href={DATAFAST_SHARE_URL}
        target="_blank"
        rel="noreferrer"
        className={itemClass({ isActive: false })}
        onClick={onNavigate}
      >
        Live stats
      </a>
      <NavLink to="/how-it-works" className={itemClass} onClick={onNavigate}>
        How it works
      </NavLink>
      <NavLink to="/terms" className={itemClass} onClick={onNavigate}>
        Terms
      </NavLink>
    </>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-full px-3 py-4 text-[16px] leading-none font-medium whitespace-nowrap transition ${
    isActive ? "font-bold text-fg-strong" : "text-muted hover:text-fg"
  }`;
}

function mobileNavClass({ isActive }: { isActive: boolean }) {
  return `rounded-2xl px-4 py-3 text-[16px] leading-none font-medium transition ${
    isActive ? "bg-white/70 font-bold text-fg-strong" : "text-muted hover:bg-white/50 hover:text-fg"
  }`;
}
