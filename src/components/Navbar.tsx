import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { SignInModal } from "./SignInModal";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[800px] items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M7 2.5V11.5M7 2.5L3.5 6M7 2.5L10.5 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-[15px] font-semibold tracking-tight">BidTop</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
            <NavLink to="/" className={navClass} end>
              Explore
            </NavLink>
            <NavLink to="/how-it-works" className={navClass}>
              How it works
            </NavLink>
            <NavLink to="/submit" className={navClass}>
              Submit Product
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSignInOpen(true)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-neutral-100"
          >
            Sign in
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-muted sm:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-line bg-white px-4 py-3 sm:hidden">
          <div className="flex flex-col text-sm">
            <Link to="/" onClick={() => setMenuOpen(false)} className="py-2 text-ink">
              Explore
            </Link>
            <Link to="/how-it-works" onClick={() => setMenuOpen(false)} className="py-2 text-ink">
              How it works
            </Link>
            <Link to="/submit" onClick={() => setMenuOpen(false)} className="py-2 text-ink">
              Submit Product
            </Link>
          </div>
        </div>
      ) : null}

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </header>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? "text-ink" : "hover:text-ink";
}
