import { useEffect } from "react";
import { useStore } from "../store/Store";

export function Toast() {
  const { toast, dismissToast } = useStore();

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(dismissToast, 2600);
    return () => window.clearTimeout(timer);
  }, [toast, dismissToast]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="animate-toast-in rounded-full border border-line bg-white px-4 py-2 text-sm font-medium shadow-[var(--shadow-hover)]">
        {toast.message}
      </div>
    </div>
  );
}
