import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Toast } from "./Toast";

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-svh flex-col bg-page text-ink">
      <Navbar />
      <main className="mx-auto w-full max-w-[800px] flex-1 px-4 py-10 sm:py-14">
        {children}
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[800px] flex-col gap-1 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium text-ink">BidTop</span>
          <span>The highest bid gets the top spot.</span>
        </div>
      </footer>
      <Toast />
    </div>
  );
}
