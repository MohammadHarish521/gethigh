import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { formatMoney } from "../utils/format";

export function MockCheckoutPage() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"pay" | "fail" | null>(null);

  useEffect(() => {
    if (!paymentId) return;
    api
      .payment(paymentId)
      .then((data) => setAmount(data.payment.amount))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Payment not found.");
      });
  }, [paymentId]);

  async function confirm() {
    if (!paymentId) return;
    setLoading("pay");
    try {
      await api.mockConfirm(paymentId);
      navigate(`/payment/success?payment_id=${paymentId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Mock payment failed.");
      setLoading(null);
    }
  }

  async function fail() {
    if (!paymentId) return;
    setLoading("fail");
    try {
      await api.mockFail(paymentId);
      navigate(`/payment/success?payment_id=${paymentId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not fail payment.");
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Development checkout. Polar credentials are not configured, so this mock
        payment stands in for Polar Checkout.
      </div>
      <div className="rounded-md border border-line bg-white p-5">
        <h1 className="text-lg font-semibold tracking-tight">Complete bid payment</h1>
        <p className="mt-1 text-sm text-muted">
          {amount !== null
            ? `Charge ${formatMoney(amount)} for this bid.`
            : "Loading payment…"}
        </p>
        {error ? <p className="mt-3 text-sm text-accent">{error}</p> : null}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={confirm}
            disabled={loading !== null || amount === null}
            className="btn-primary"
          >
            {loading === "pay" ? "Confirming…" : "Pay (mock)"}
          </button>
          <button
            type="button"
            onClick={fail}
            disabled={loading !== null}
            className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            {loading === "fail" ? "Failing…" : "Simulate failed payment"}
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          <Link to="/" className="hover:text-ink">
            Cancel and return
          </Link>
        </p>
      </div>
    </div>
  );
}
