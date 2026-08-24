import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { usePresence } from "../hooks/usePresence";
import { Navbar } from "./Navbar";

export function Layout({ children }: { children: ReactNode }) {
  // Counts the visit on every route, not just the pages that render the tally.
  usePresence();

  return (
    <div className="flex min-h-svh flex-col bg-bg text-fg">
      <Navbar />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-10 pb-10 sm:pt-[60px]">
        {children}
      </main>
      <footer className="px-4 pt-8 pb-16 text-center text-[14px] tracking-[-0.26px] text-muted">
        <p>gethigh · Dump them. Your URL takes the spot.</p>
        <nav className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link to="/how-it-works" className="hover:text-fg hover:underline">
            How it works
          </Link>
          <Link to="/" className="hover:text-fg hover:underline">
            Leaderboard
          </Link>
          <span>Payments by Dodo</span>
        </nav>
      </footer>
    </div>
  );
}
