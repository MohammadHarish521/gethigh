import { useState, type FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";
import { Modal } from "./Modal";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="auth-title">
      <h2 id="auth-title" className="text-lg font-semibold tracking-tight">
        {mode === "login" ? "Welcome back" : "Create an account"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {mode === "login"
          ? "Sign in to bid or submit a product."
          : "Join BidTop to compete for the top spot."}
      </p>
      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        {mode === "signup" ? (
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </label>
        ) : null}
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Password</span>
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading
            ? "Please wait…"
            : mode === "login"
              ? "Log in"
              : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        {mode === "login" ? "New here?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="font-medium text-ink"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
        >
          {mode === "login" ? "Create an account" : "Log in"}
        </button>
      </p>
      <p className="mt-3 text-center text-xs text-muted">
        Demo: demo@bidtop.com / demo1234
      </p>
    </Modal>
  );
}
