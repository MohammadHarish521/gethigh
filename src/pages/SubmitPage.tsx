import { useState } from "react";
import { SubmitProductForm } from "../components/SubmitProductForm";
import { AuthModal } from "../components/AuthModal";
import { useAuth } from "../hooks/useAuth";

export function SubmitPage() {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="animate-fade-up mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Submit a product</h1>
      <p className="mt-2 text-sm text-muted">
        Pay a starting bid of at least $1. After payment is confirmed, your product joins the leaderboard.
      </p>
      {user ? (
        <div className="mt-6 rounded-md border border-line bg-white p-5">
          <SubmitProductForm />
        </div>
      ) : (
        <div className="mt-6 rounded-md border border-line bg-white px-5 py-8 text-center">
          <p className="text-sm text-muted">Sign in to submit a product.</p>
          <button type="button" onClick={() => setAuthOpen(true)} className="btn-primary mt-4">Log in</button>
        </div>
      )}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
