import type { LucideIcon } from "lucide-react";
import { ArrowDown, Crown, Medal, Radio } from "lucide-react";

const medals = {
  1: {
    icon: Crown,
    label: "1st",
    glow: "bg-[#f5c518]",
    face: "bg-gradient-to-b from-[#ffe56a] to-[#e8b40a] text-[#6b4e00]",
    ring: "ring-[3px] ring-[#fff3b0]",
    size: "2xl" as const,
    tone: "text-[#b8860b]",
  },
  2: {
    icon: Medal,
    label: "2nd",
    glow: "bg-[#9aa8bc]",
    face: "bg-gradient-to-b from-[#f4f6f8] to-[#8e9aab] text-[#334155]",
    ring: "ring-[3px] ring-white",
    size: "xl" as const,
    tone: "text-[#4b5563]",
  },
  3: {
    icon: Medal,
    label: "3rd",
    glow: "bg-[#c47a3a]",
    face: "bg-gradient-to-b from-[#f0b07a] to-[#c06a28] text-[#5c2e0c]",
    ring: "ring-[3px] ring-[#ffd7b0]",
    size: "lg" as const,
    tone: "text-[#9a5a22]",
  },
} as const;

type FloatingBadgeProps = {
  icon: LucideIcon;
  glow: string;
  face: string;
  ring: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  glowStrength?: "full" | "soft";
};

const badgeSize = {
  sm: { box: "size-8", icon: 15 },
  md: { box: "size-10", icon: 18 },
  lg: { box: "size-14", icon: 26 },
  xl: { box: "size-16 sm:size-[4.5rem]", icon: 32 },
  "2xl": { box: "size-[4.75rem] sm:size-24", icon: 42 },
} as const;

export function FloatingBadge({
  icon: Icon,
  glow,
  face,
  ring,
  size = "md",
  className = "",
  glowStrength = "full",
}: FloatingBadgeProps) {
  const { box, icon: iconSize } = badgeSize[size];

  return (
    <div className={`shrink-0 ${className}`} aria-hidden="true">
      <div className="relative">
        <span
          className={`${glowStrength === "soft" ? "medal-glow-soft" : "medal-glow"} ${glow}`}
        />
        <span
          className={`relative flex ${box} items-center justify-center rounded-full shadow-[0_10px_22px_rgb(26_34_43/0.22)] ${face} ${ring}`}
        >
          <Icon size={iconSize} strokeWidth={2.4} />
        </span>
      </div>
    </div>
  );
}

export function RankBadge({ rank }: { rank: number | null }) {
  if (rank !== 1 && rank !== 2 && rank !== 3) return null;

  const medal = medals[rank];

  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1 self-center pl-1 sm:pl-2">
      <FloatingBadge
        icon={medal.icon}
        glow={medal.glow}
        face={medal.face}
        ring={medal.ring}
        size={medal.size}
      />
      <span
        className={`text-[12px] font-extrabold tracking-[-0.02em] sm:text-[13px] ${medal.tone}`}
      >
        {medal.label}
      </span>
    </div>
  );
}

export function FloatingMedal({ rank }: { rank: number | null }) {
  return <RankBadge rank={rank} />;
}

export const dumpBadge = {
  icon: ArrowDown,
  glow: "bg-[#ff8f39]",
  face: "bg-gradient-to-b from-[#ffb36a] to-[#df5c0f] text-white",
  ring: "ring-[3px] ring-[#ffd7b0]",
} as const;

export const recentDumpBadge = {
  icon: Radio,
  glow: "bg-[#8fbf14]",
  face: "bg-gradient-to-b from-[#c4e85a] to-[#508200] text-white",
  ring: "ring-[3px] ring-[#eaffb0]",
} as const;
