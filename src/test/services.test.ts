import { beforeEach, describe, expect, it, vi } from 'vitest';

/** A chainable stand-in for the Supabase query builder that records every call. */
const calls: { method: string; args: unknown[] }[] = [];
let result: { data: unknown; error: { message: string } | null } = { data: [{ id: 'x' }], error: null };

function builder() {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'order', 'maybeSingle', 'single']) {
    b[m] = (...args: unknown[]) => {
      calls.push({ method: m, args });
      return b;
    };
  }
  b.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return b;
}

const rpc = vi.fn();
vi.mock('../lib/supabase', () => ({
  supabase: { from: (t: string) => (calls.push({ method: 'from', args: [t] }), builder()), rpc: (...a: unknown[]) => rpc(...a) },
}));

import { generateToken, shareUrl } from '../lib/token';
import { slugify, uniqueSlug } from '../lib/slug';
import { addSongsToSetlist, createSetlist, createShareToken, deleteSetlist, removeSongFromSetlist, reorderSetlistSongs, stopSharing } from '../services/setlistService';
import { getSharedSetlist } from '../services/sharedService';

const find = (m: string) => calls.filter((c) => c.method === m);

beforeEach(() => {
  calls.length = 0;
  result = { data: [{ id: 'x' }], error: null };
  rpc.mockReset();
});

describe('share links', () => {
  it('createShareToken saves a 128-bit random token on the right setlist and returns it', async () => {
    const token = await createShareToken('sl1');
    expect(token).toMatch(/^[a-z0-9]{32}$/);
    expect(find('from')[0].args).toEqual(['folders']);
    expect(find('update')[0].args).toEqual([{ share_token: token }]);
    expect(find('eq')[0].args).toEqual(['id', 'sl1']);
  });
  it('every link is different (and unguessable)', async () => {
    const tokens = new Set(await Promise.all(Array.from({ length: 50 }, () => createShareToken('sl1'))));
    expect(tokens.size).toBe(50);
  });
  it('stopSharing clears the token', async () => {
    await stopSharing('sl1');
    expect(find('update')[0].args).toEqual([{ share_token: null }]);
  });
  it('a non-admin gets a clear message, not a crash', async () => {
    result = { data: null, error: { message: 'new row violates row-level security policy' } };
    await expect(createShareToken('sl1')).rejects.toThrow(/only the admin/i);
  });
  it('fails loudly if nothing was updated (e.g. setlist deleted meanwhile)', async () => {
    result = { data: [], error: null };
    await expect(createShareToken('gone')).rejects.toThrow();
  });
  it('the visitor side asks the database for exactly the token in the link', async () => {
    rpc.mockResolvedValue({ data: { folder: { id: 'f', name: 'X', description: '' }, songs: [] }, error: null });
    const r = await getSharedSetlist('abc123');
    expect(rpc).toHaveBeenCalledWith('get_shared_setlist', { p_token: 'abc123' });
    expect(r?.folder.name).toBe('X');
  });
  it('an unknown or revoked token comes back as null', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await getSharedSetlist('nope')).toBeNull();
  });
  it('a server error is raised, not hidden', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(getSharedSetlist('x')).rejects.toThrow('boom');
  });
  it('builds the share URL from the current site', () => {
    expect(shareUrl('abc')).toBe(`${window.location.origin}/s/abc`);
  });
});

describe('setlists', () => {
  it('creating a setlist keeps it private to the share link (not public on the website)', async () => {
    result = { data: { id: 'n', name: 'Christmas Event', description: '', share_token: null, created_at: '', updated_at: '' }, error: null };
    await createSetlist({ name: 'Christmas Event 🎄', description: '' });
    const row = find('insert')[0].args[0] as Record<string, unknown>;
    expect(row.is_public).toBe(false);
    expect(row.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(String(row.slug).length).toBeLessThanOrEqual(60);
    expect(String(row.slug).startsWith('christmas-event-')).toBe(true);
  });
  it('adding songs appends them in order after the existing ones, skipping duplicates', async () => {
    await addSongsToSetlist('sl1', ['a', 'b', 'c'], 4);
    const [rows, opts] = find('upsert')[0].args as [Record<string, unknown>[], Record<string, unknown>];
    expect(rows).toEqual([
      { folder_id: 'sl1', song_id: 'a', position: 4 },
      { folder_id: 'sl1', song_id: 'b', position: 5 },
      { folder_id: 'sl1', song_id: 'c', position: 6 },
    ]);
    expect(opts).toEqual({ onConflict: 'folder_id,song_id', ignoreDuplicates: true });
  });
  it('adding nothing makes no request', async () => {
    await addSongsToSetlist('sl1', [], 0);
    expect(calls.length).toBe(0);
  });
  it('reordering rewrites positions 0..n-1 in one request', async () => {
    await reorderSetlistSongs('sl1', ['c', 'a', 'b']);
    expect(find('upsert')).toHaveLength(1);
    expect(find('upsert')[0].args[0]).toEqual([
      { folder_id: 'sl1', song_id: 'c', position: 0 },
      { folder_id: 'sl1', song_id: 'a', position: 1 },
      { folder_id: 'sl1', song_id: 'b', position: 2 },
    ]);
  });
  it('removing a song only touches that setlist membership, never the song itself', async () => {
    await removeSongFromSetlist('sl1', 's9');
    expect(find('from')[0].args).toEqual(['folder_songs']);
    expect(find('delete')).toHaveLength(1);
    expect(find('eq').map((c) => c.args)).toEqual([['folder_id', 'sl1'], ['song_id', 's9']]);
  });
  it('deleting a setlist deletes from folders only', async () => {
    await deleteSetlist('sl1');
    expect(find('from').map((c) => c.args[0])).toEqual(['folders']);
  });
});

describe('helpers', () => {
  it('generateToken: 32 hex chars', () => expect(generateToken()).toMatch(/^[0-9a-f]{32}$/));
  it('slugify handles accents, emoji and symbols', () => {
    expect(slugify('Café Señor 🎄 Night!')).toBe('cafe-senor-night');
    expect(slugify('🎄🎄')).toBe('');
  });
  it('uniqueSlug always satisfies the database rule', () => {
    for (const name of ['Christmas Event', '🎄', 'A'.repeat(200), '  weird   name  ']) {
      const s = uniqueSlug(name);
      expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(s.length).toBeLessThanOrEqual(60);
    }
  });
});
