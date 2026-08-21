import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { PaymentStatusView } from "../components/PaymentStatus";
import type { PaymentStatus } from "../types";

export function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const paymentId = params.get("payment_id");
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paymentId) {
      setError("Missing payment id.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      try {
        const data = await api.payment(paymentId!);
        if (cancelled) return;
        setStatus(data);
        setLoading(false);
        if (data.payment.status === "pending" && attempts < 40) {
          attempts += 1;
          window.setTimeout(poll, 1500);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load payment.");
        setLoading(false);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  return (
    <div className="mx-auto max-w-lg">
      <PaymentStatusView status={status} loading={loading} error={error} />
    </div>
  );
}
