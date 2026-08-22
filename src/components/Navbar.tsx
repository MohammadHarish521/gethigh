import { Link, NavLink } from "react-router-dom";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="mx-auto flex w-full max-w-[792px] items-center justify-between gap-2 rounded-full bg-bg/85 py-[5px] pr-[5px] pl-4 backdrop-blur-md sm:pl-[23px]">
        <Link to="/" className="flex shrink-0 items-center gap-1.5">
          <span className="font-display text-[20px] font-extrabold tracking-[-0.06em] text-fg-strong sm:text-[22px]">
            gethigh
          </span>
          <span className="rounded-full border-2 border-[#ffd7b0] bg-gradient-to-b from-[#ffb36a] to-[#df5c0f] px-2 py-0.5 text-[11px] font-semibold tracking-[-0.2px] text-white shadow-[0_4px_12px_rgb(223_92_15/0.3)] sm:text-[12px]">
            dump
          </span>
        </Link>
        <nav className="flex items-center" aria-label="Main">
          <NavLink to="/" className={navClass} end>
            <span className="sm:hidden">Board</span>
            <span className="hidden sm:inline">Leaderboard</span>
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
