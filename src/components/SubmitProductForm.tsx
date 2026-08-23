import { useState, type FormEvent, type ReactNode } from "react";
import { api } from "../api/client";
import { MIN_BID } from "../lib/constants";

export function SubmitProductForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [startingBid, setStartingBid] = useState(String(MIN_BID));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 400_000) {
      setError("Logo must be under 400KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setLogoUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const amount = Number(startingBid);
    if (!Number.isInteger(amount) || amount < MIN_BID) {
      setError(`Starting bid must be a whole dollar amount of at least $${MIN_BID}.`);
      return;
    }
    if (!logoUrl) {
      setError("Add a logo or image.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const checkout = await api.submitProduct({
        name,
        description,
        url,
        logoUrl,
        creatorName,
        startingBid: amount,
      });
      window.location.href = checkout.checkoutUrl;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not submit product.");
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Field label="Product name">
        <input
          required
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="input"
          placeholder="Arc"
        />
      </Field>
      <Field label="One-line description">
        <input
          required
          maxLength={500}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="input"
          placeholder="A calmer browser for people who live in too many tabs."
        />
      </Field>
      <Field label="Website URL">
        <input
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="input"
          placeholder="https://example.com"
        />
      </Field>
      <Field label="Logo URL">
        <input
          value={logoUrl.startsWith("data:") ? "" : logoUrl}
          onChange={(event) => setLogoUrl(event.target.value)}
          className="input"
          placeholder="https://… or upload a file"
        />
        <input
          type="file"
          accept="image/*"
          className="mt-2 block text-sm text-muted"
          onChange={(event) => onFile(event.target.files?.[0])}
        />
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo preview"
            className="mt-3 h-12 w-12 rounded-md border border-line object-cover"
          />
        ) : null}
      </Field>
      <Field label="Creator name">
        <input
          value={creatorName}
          onChange={(event) => setCreatorName(event.target.value)}
          className="input"
          placeholder="Your name or company"
        />
      </Field>
      <Field label="Starting bid (USD)">
        <input
          required
          type="number"
          min={MIN_BID}
          step={1}
          value={startingBid}
          onChange={(event) => setStartingBid(event.target.value)}
          className="input"
        />
        <p className="mt-1 text-xs text-muted">
          Minimum is ${MIN_BID}. You’ll pay this in full to enter the board, and
          the spot bleeds 5% a day after that.
        </p>
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Starting checkout…" : "Submit and pay starting bid"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      {children}
    </label>
  );
}
