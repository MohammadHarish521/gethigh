import { Link, NavLink } from "react-router-dom";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="mx-auto flex w-full max-w-[792px] items-center justify-between gap-2 rounded-full bg-bg/85 py-[5px] pr-[5px] pl-[5px] backdrop-blur-md">
        <Link
          to="/"
          aria-label="gethigh dump home"
          className="block h-[30px] w-[131px] shrink-0 overflow-hidden sm:h-12 sm:w-[210px]"
        >
          <img
            src="/favicon.png"
            alt="gethigh dump"
            className="h-full w-full object-cover object-center"
          />
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
