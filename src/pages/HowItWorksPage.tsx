import { Link } from "react-router-dom";

const steps = [
  {
    n: "1",
    title: "Submit",
    body: "List your product with a starting bid of $1. That’s enough to join the board.",
  },
  {
    n: "2",
    title: "Bid",
    body: "Anyone can raise the bid. Each new bid has to beat the current highest amount.",
  },
  {
    n: "3",
    title: "Rank",
    body: "The leaderboard is ranked by bid. Whoever pays the most sits at #1.",
  },
];

export function HowItWorksPage() {
  return (
    <div className="animate-fade-up">
      <section className="max-w-xl">
        <h1 className="text-[32px] font-semibold tracking-tight sm:text-4xl">
          How it works
        </h1>
        <p className="mt-2 text-[15px] text-muted sm:text-base">
          Products compete for visibility. The highest bid gets the top spot.
        </p>
      </section>

      <ol className="mt-10 grid gap-3 sm:grid-cols-3">
        {steps.map((step) => (
          <li
            key={step.n}
            className="rounded-2xl border border-line bg-white px-5 py-6"
          >
            <div className="text-2xl font-semibold tabular-nums tracking-tight text-faint">
              {step.n}
            </div>
            <h2 className="mt-4 text-[15px] font-medium tracking-tight">{step.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 rounded-2xl border border-line bg-white px-5 py-6 sm:px-6">
        <h2 className="text-[15px] font-medium tracking-tight">The rule</h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
          There is only one ranking signal: the current bid. No upvotes, no algorithms,
          no recency boost on the main board. If you want #1, you outbid whoever is there.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/" className="btn-primary">
            See the leaderboard
          </Link>
          <Link to="/submit" className="btn-secondary">
            Submit a product
          </Link>
        </div>
      </div>
    </div>
  );
}
