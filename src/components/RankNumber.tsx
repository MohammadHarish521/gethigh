type RankNumberProps = {
  rank: number | null;
};

export function RankNumber({ rank }: RankNumberProps) {
  if (rank == null) return <div className="w-9 shrink-0 sm:w-10" />;

  const tone =
    rank === 1
      ? "text-[26px] font-semibold tracking-tight text-ink sm:text-[28px]"
      : rank === 2
        ? "text-[22px] font-semibold tracking-tight text-neutral-600 sm:text-2xl"
        : rank === 3
          ? "text-xl font-medium tracking-tight text-neutral-500 sm:text-[22px]"
          : "text-[17px] font-medium text-faint";

  return (
    <div
      className={`w-9 shrink-0 text-center tabular-nums sm:w-10 ${tone}`}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </div>
  );
}
