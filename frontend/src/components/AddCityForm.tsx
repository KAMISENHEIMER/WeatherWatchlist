import { useState, type FormEvent } from "react";

interface Props {
  /** Saves the city. Rejects with an Error whose message is shown under the input. */
  onAdd: (name: string) => Promise<void>;
}

const MAX_NAME_LENGTH = 100; // matches the backend's limit

export default function AddCityForm({ onAdd }: Props) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser's full-page form submit

    const trimmed = name.trim();
    if (trimmed === "") {
      setError("Please enter a city name");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onAdd(trimmed);
      setName("");
    } catch (err) {
      // e.g. "Couldn't find a city called ..." (404) or "... is already in your watchlist" (409)
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="add-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor="city-name">Add a city</label>
      <div className="add-form-row">
        <input
          id="city-name"
          type="text"
          placeholder="Search for a city"
          autoComplete="off"
          maxLength={MAX_NAME_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          aria-invalid={error !== null}
          aria-describedby={error ? "city-name-error" : undefined}
        />
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Adding…" : "Add"}
        </button>
      </div>
      {error && (
        <p id="city-name-error" className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
