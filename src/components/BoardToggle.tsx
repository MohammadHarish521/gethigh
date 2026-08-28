import type { BoardKind } from "../lib/constants";

type BoardToggleProps = {
  value: BoardKind;
  onChange: (board: BoardKind) => void;
};

export function BoardToggle({ value, onChange }: BoardToggleProps) {
  return (
    <div className="board-toggle" role="tablist" aria-label="Leaderboard">
      <button
        type="button"
        role="tab"
        aria-selected={value === "alltime"}
        className={`board-toggle-btn ${value === "alltime" ? "is-active" : ""}`}
        onClick={() => onChange("alltime")}
      >
        <TrophyIcon />
        All-time
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "today"}
        className={`board-toggle-btn ${value === "today" ? "is-active" : ""}`}
        onClick={() => onChange("today")}
      >
        <span className="board-toggle-dot" aria-hidden="true" />
        Today
      </button>
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg
      className="board-toggle-trophy"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.2 2.2h7.6v2.4a3.8 3.8 0 0 1-3.8 3.8 3.8 3.8 0 0 1-3.8-3.8V2.2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M4.2 3.4H2.6A2 2 0 0 0 4.6 5.4M11.8 3.4h1.6A2 2 0 0 1 11.4 5.4M8 8.4v2.2M5.6 13.2h4.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
