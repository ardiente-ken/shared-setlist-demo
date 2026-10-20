import { useState } from 'react';
import { copyText, shareUrl } from '../../lib/token';
import type { Setlist } from '../../models/setlist';
import { createShareToken, stopSharing } from '../../services/setlistService';

interface Props {
  setlist: Setlist;
  onChanged: () => Promise<void> | void;
}

/** Turn the shareable link on/off, copy it, or replace it with a fresh one. */
export default function SharePanel({ setlist, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = setlist.share_token ? shareUrl(setlist.share_token) : null;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    await copyText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="card">
      <h2>Share link</h2>
      {!url ? (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            Not shared. Create a link and anyone who has it can read this setlist and its chords. No sign-in needed.
          </p>
          <button className="btn btn-primary" disabled={busy} onClick={() => void run(() => createShareToken(setlist.id))}>
            {busy ? 'Creating…' : 'Create share link'}
          </button>
        </>
      ) : (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            <span className="badge badge-on">Shared</span> Anyone with this link can view the setlist and chords.
          </p>
          <div className="share-url">
            <input className="input" readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Share link" />
            <button className="btn btn-primary" onClick={() => void copy()}>{copied ? 'Copied ✓' : 'Copy'}</button>
          </div>
          <div className="share-actions">
            <a className="btn btn-sm" href={url} target="_blank" rel="noreferrer">Open as viewer ↗</a>
            <button className="btn btn-sm" disabled={busy}
              onClick={() => {
                if (window.confirm('Make a new link? The current link will stop working for everyone.')) {
                  void run(() => createShareToken(setlist.id));
                }
              }}>
              New link
            </button>
            <button className="btn btn-sm btn-danger" disabled={busy}
              onClick={() => {
                if (window.confirm('Stop sharing? The link will stop working immediately.')) {
                  void run(() => stopSharing(setlist.id));
                }
              }}>
              Stop sharing
            </button>
          </div>
        </>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
