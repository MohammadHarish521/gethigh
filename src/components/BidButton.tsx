type BidButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  children?: string;
  size?: "sm" | "lg";
};

export function BidButton({
  onClick,
  disabled,
  children = "Bid",
  size = "sm",
}: BidButtonProps) {
  const compact =
    "rounded-lg border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink transition-colors hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-50";
  const large =
    "rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={size === "lg" ? large : compact}
    >
      {children}
    </button>
  );
}
