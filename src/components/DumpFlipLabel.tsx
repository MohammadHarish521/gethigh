import { formatMoney } from "../utils/format";

export function DumpFlipLabel({
  cost,
  busy,
  busyLabel = "Dumping…",
}: {
  cost?: number | null;
  busy?: boolean;
  busyLabel?: string;
}) {
  if (busy) return busyLabel;

  const sized = cost != null ? `Dump · ${formatMoney(cost)}` : "Dump";

  return (
    <span className="dump-flip" aria-hidden="true">
      <span className="dump-flip-sizer">{sized}</span>
      <span className="dump-flip-live" aria-hidden="true">
        <span>{sized}</span>
        <span>take this spot</span>
      </span>
    </span>
  );
}
