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

  const idle = cost != null ? `Dump · ${formatMoney(cost)}` : "Dump";
  const hover = "take this spot";

  return (
    <span className="dump-flip" aria-hidden="true">
      <span className="dump-flip-sizer">
        <span>{idle}</span>
        <span>{hover}</span>
      </span>
      <span className="dump-flip-live">
        <span>{idle}</span>
        <span>{hover}</span>
      </span>
    </span>
  );
}
