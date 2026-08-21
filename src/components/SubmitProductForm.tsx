import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { makeLogo } from "../data/mock";
import { useStore } from "../store/Store";

export function SubmitProductForm() {
  const { submitProduct } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [startingBid, setStartingBid] = useState("1");
  const [error, setError] = useState<string | null>(null);

  function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 400_000) {
      setError("Logo must be under 400KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoUrl(reader.result);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const amount = Number(startingBid);
    if (!Number.isInteger(amount) || amount < 1) {
      setError("Starting bid must be a whole dollar amount of at least $1.");
      return;
    }

    submitProduct({
      name,
      description,
      url,
      logoUrl: logoUrl || makeLogo(name),
      startingBid: amount,
    });
    navigate("/");
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
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

      <Field label="Short description">
        <input
          required
          maxLength={120}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="input"
          placeholder="The simplest workspace for modern teams."
        />
      </Field>

      <Field label="Website URL">
        <input
          required
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="input"
          placeholder="https://example.com"
        />
      </Field>

      <Field label="Logo">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[10px] border border-line bg-page">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo preview" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-medium text-faint">
                {name.trim().charAt(0).toUpperCase() || "B"}
              </span>
            )}
          </div>
          <label className="btn-secondary cursor-pointer px-3 py-2 text-sm">
            Upload
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => onFile(event.target.files?.[0])}
            />
          </label>
        </div>
        <p className="mt-1.5 text-xs text-muted">Optional. We’ll use a letter mark if you skip this.</p>
      </Field>

      <Field label="Starting bid">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            $
          </span>
          <input
            required
            type="number"
            min={1}
            step={1}
            value={startingBid}
            onChange={(event) => setStartingBid(event.target.value)}
            className="input pl-7"
          />
        </div>
        <p className="mt-1.5 text-xs text-muted">Bidding starts at $1.</p>
      </Field>

      {error ? <p className="text-sm text-accent">{error}</p> : null}

      <button type="submit" className="btn-primary w-full sm:w-auto">
        Submit product
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-muted">{label}</span>
      {children}
    </label>
  );
}
