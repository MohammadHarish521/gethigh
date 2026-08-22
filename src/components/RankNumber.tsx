type RankNumberProps = {
  rank: number | null;
};

const rankTone: Record<number, string> = {
  1: "font-extrabold text-[#b8860b]",
  2: "font-extrabold text-[#4b5563]",
  3: "font-extrabold text-[#9a5a22]",
};

export function RankNumber({ rank }: RankNumberProps) {
  if (rank == null) return null;

  return (
    <span
      className={`shrink-0 text-[26px] tracking-[-0.04em] ${rankTone[rank] ?? "font-semibold text-fg-strong"}`}
      aria-label={`Rank ${rank}`}
    >
      #{rank}
    </span>
  );
}
