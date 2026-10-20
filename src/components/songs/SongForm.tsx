import { useState } from 'react';
import type { FormEvent } from 'react';
import { EMPTY_SONG } from '../../models/song';
import type { SongInput } from '../../models/song';
import ChordLyrics from './ChordLyrics';
import '../../styles/viewer.css';

interface Props {
  /** Omit for "add"; pass an existing song's values for "edit". */
  initial?: SongInput;
  submitLabel: string;
  onSubmit: (values: SongInput) => Promise<void>;
  onCancel: () => void;
}

const LYRICS_PLACEHOLDER = `[Verse 1]
[Am]I walk a lonely [G]road
[F]The only one that [C]I have ever known

or paste the classic style:

   Am          G
I walk a lonely road`;

/** One form for adding AND editing a song. Preview shows how it will look to readers. */
export default function SongForm({ initial = EMPTY_SONG, submitLabel, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<SongInput>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const set = <K extends keyof SongInput>(key: K, value: SongInput[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!values.title.trim() || !values.artist.trim()) {
      setError('Title and artist are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ ...values, title: values.title.trim(), artist: values.artist.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the song.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="editor-grid">
        <div className="form-fields">
          <div className="form-row">
            <label className="field">
              Title
              <input className="input" value={values.title} required onChange={(e) => set('title', e.target.value)} />
            </label>
            <label className="field">
              Artist
              <input className="input" value={values.artist} required onChange={(e) => set('artist', e.target.value)} />
            </label>
          </div>

          <label className="field">
            Capo / chord summary (optional)
            <input className="input" value={values.chords} placeholder="e.g. Capo 2 · Am F C G" onChange={(e) => set('chords', e.target.value)} />
          </label>

          <label className="field">
            Lyrics with chords
            <textarea className="input lyrics-input" rows={14} spellCheck={false} autoCapitalize="off" autoCorrect="off"
              value={values.lyrics} placeholder={LYRICS_PLACEHOLDER} onChange={(e) => set('lyrics', e.target.value)} />
            <span className="hint">
              Put chords in [brackets] right before the syllable, or paste a chord line above each lyric line.
              Headers like [Chorus] or "Verse 1" are detected.
            </span>
          </label>
        </div>

        <aside className={`preview ${showPreview ? 'is-open' : ''}`} aria-label="Preview">
          <p className="preview-label">Preview</p>
          <h3 className="song-title">{values.title || 'Untitled'}</h3>
          <p className="song-artist">{values.artist}</p>
          {values.chords.trim() && <p className="song-meta">{values.chords}</p>}
          <ChordLyrics source={values.lyrics} fontSize={16} />
        </aside>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="form-actions">
        <button type="button" className="btn preview-toggle" aria-pressed={showPreview} onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? 'Hide preview' : 'Preview'}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}
