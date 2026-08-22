type BidButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  children?: string;
};

export function BidButton({ onClick, disabled, children = "Bid" }: BidButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-50"
    >
      {children}
    </button>
  );
}
