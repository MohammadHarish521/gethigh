import { SubmitProductForm } from "../components/SubmitProductForm";

export function SubmitPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
        Submit a product
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Join the leaderboard with a starting bid of $1. The highest bid takes the top spot.
      </p>

      <div className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <SubmitProductForm />
      </div>
    </div>
  );
}
