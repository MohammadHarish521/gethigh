import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
};

export function Modal({ open, onClose, children, labelledBy }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="animate-overlay-in absolute inset-0 bg-black/25"
        aria-label="Dismiss"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="animate-modal-in relative w-full max-w-md rounded-[28px] bg-white p-6 pr-14 shadow-[var(--shadow-modal)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full text-muted transition-[background-color,color,transform] duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-black/5 hover:text-fg active:scale-95"
          aria-label="Close"
        >
          <X size={18} strokeWidth={2.2} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
