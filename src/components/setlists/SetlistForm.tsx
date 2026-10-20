import { useState } from 'react';
import type { FormEvent } from 'react';
import type { SetlistInput } from '../../models/setlist';

interface Props {
  initial?: SetlistInput;
  submitLabel: string;
  onSubmit: (values: SetlistInput) => Promise<void>;
  onCancel: () => void;
}

/** One form for creating AND editing a setlist. */
export default function SetlistForm({ initial = { name: '', description: '' }, submitLabel, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<SetlistInput>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const name = values.name.trim();
    if (!name) return setError('Give the setlist a name.');
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ name, description: values.description.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the setlist.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-fields" style={{ maxWidth: 640 }}>
        <label className="field">
          <span>Setlist name</span>
          <input className="input" value={values.name} maxLength={80} required placeholder="e.g. Christmas Event"
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
        </label>
        <label className="field">
          <span>Note for viewers (optional)</span>
          <input className="input" value={values.description} maxLength={300} placeholder="e.g. Dec 20 · Cebu City"
            onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} />
        </label>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}
