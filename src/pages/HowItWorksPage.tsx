import { Link } from "react-router-dom";

const steps = [
  {
    n: "1",
    title: "Dump anyone",
    body: "Pay a 25% premium on their current bid, paste your URL, and you sit in their spot at that higher number. They drop to $0 and last — still on the board, just humiliated. Same dump on All-time and Today.",
    tone: "text-fire-deep",
  },
  {
    n: "2",
    title: "Or take the seat",
    body: "Paste a URL or @handle and pay what you type. On the all-time board a bid has to clear the top by $5 or 10%, whichever is bigger. Today’s board starts at $2 and climbs $1. Two listings can never sit at the same price. Every bid is charged in full.",
    tone: "text-accent",
  },
  {
    n: "3",
    title: "Hold it or lose it",
    body: "All-time spots bleed 5% of their price a day. Stop feeding a listing and it sinks — cheap enough to dump. Today’s board doesn’t decay; it just wipes at midnight.",
    tone: "text-fg-strong",
  },
  {
    n: "4",
    title: "Share the hit",
    body: "Every dump gets a kill card. Copy it. Post it. That’s the whole sport.",
    tone: "text-fg-strong",
  },
];

export function HowItWorksPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[756px] text-center">
      <h1 className="font-display text-[44px] leading-[0.98] font-extrabold tracking-[-0.06em] text-fg sm:text-[72px]">
        <span className="dump-word">Dump</span> is the game
      </h1>
      <p className="mx-auto mt-4 max-w-[500px] text-[16px] leading-[1.4] font-medium tracking-[-0.36px] text-muted sm:text-[18px]">
        Other boards let you climb. Here you can knock whoever’s #1 to zero.
      </p>

      <ol className="mt-10 space-y-4 text-left">
        {steps.map((step) => (
          <li key={step.n} className="card px-6 py-6 sm:px-8">
            <div className={`text-[15px] font-bold ${step.tone}`}>
              #{step.n}
            </div>
            <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.6px] text-fg-strong sm:text-[26px]">
              {step.title}
            </h2>
            <p className="mt-1 text-[15px] leading-[1.4] font-medium tracking-[-0.32px] text-muted">
              {step.body}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex justify-center">
        <Link to="/" className="btn-primary">
          Get high
        </Link>
      </div>
    </div>
  );
}
