import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginForm from '../components/admin/LoginForm';
import SetlistForm from '../components/setlists/SetlistForm';
import SetlistSongsManager from '../components/setlists/SetlistSongsManager';
import SharePanel from '../components/setlists/SharePanel';
import SongForm from '../components/songs/SongForm';
import type { Setlist } from '../models/setlist';
import type { Song } from '../models/song';

vi.mock('../services/setlistService', () => ({
  createShareToken: vi.fn().mockResolvedValue('t'.repeat(32)),
  stopSharing: vi.fn().mockResolvedValue(undefined),
  addSongsToSetlist: vi.fn().mockResolvedValue(undefined),
  removeSongFromSetlist: vi.fn().mockResolvedValue(undefined),
  reorderSetlistSongs: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../services/songService', () => ({ getSongs: vi.fn() }));
vi.mock('../services/authService', () => ({ signIn: vi.fn(), signOut: vi.fn(), checkIsAdmin: vi.fn() }));

import { signIn } from '../services/authService';
import { addSongsToSetlist, createShareToken, removeSongFromSetlist, reorderSetlistSongs, stopSharing } from '../services/setlistService';
import { getSongs } from '../services/songService';

const setlist = (token: string | null): Setlist => ({
  id: 'sl1', name: 'Christmas', description: '', share_token: token, created_at: '', updated_at: '',
});

beforeEach(() => vi.clearAllMocks());

describe('share link panel', () => {
  it('creates a link', async () => {
    const onChanged = vi.fn();
    render(<SharePanel setlist={setlist(null)} onChanged={onChanged} />);
    expect(screen.getByText(/not shared/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /create share link/i }));
    await waitFor(() => expect(createShareToken).toHaveBeenCalledWith('sl1'));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('shows the full link and copies it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const token = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    render(<SharePanel setlist={setlist(token)} onChanged={vi.fn()} />);
    const url = `${window.location.origin}/s/${token}`;
    expect((screen.getByLabelText('Share link') as HTMLInputElement).value).toBe(url);
    fireEvent.click(screen.getByRole('button', { name: /^copy$/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(url));
    expect(await screen.findByText(/copied/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /open as viewer/i }).getAttribute('href')).toBe(url);
  });

  it('"New link" asks first, then replaces the link', async () => {
    const onChanged = vi.fn();
    render(<SharePanel setlist={setlist('x'.repeat(32))} onChanged={onChanged} />);
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: /new link/i }));
    expect(createShareToken).not.toHaveBeenCalled();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: /new link/i }));
    await waitFor(() => expect(createShareToken).toHaveBeenCalledWith('sl1'));
  });

  it('"Stop sharing" asks first, then turns the link off', async () => {
    render(<SharePanel setlist={setlist('x'.repeat(32))} onChanged={vi.fn()} />);
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: /stop sharing/i }));
    expect(stopSharing).not.toHaveBeenCalled();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: /stop sharing/i }));
    await waitFor(() => expect(stopSharing).toHaveBeenCalledWith('sl1'));
  });

  it('shows an error if it fails', async () => {
    vi.mocked(createShareToken).mockRejectedValueOnce(new Error('Only the admin can change setlists.'));
    render(<SharePanel setlist={setlist(null)} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /create share link/i }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/only the admin/i);
  });
});

const song = (id: string, title: string, over: Partial<Song> = {}): Song => ({
  id, title, artist: 'AKN', lyrics: 'la', chords: '', is_active: true, created_at: '', updated_at: '', ...over,
});

describe('songs inside a setlist', () => {
  const all = [song('1', 'Alpha'), song('2', 'Bravo'), song('3', 'Charlie'), song('4', 'Delta'), song('5', 'Echo', { is_active: false })];
  beforeEach(() => vi.mocked(getSongs).mockResolvedValue(all));
  const renderManager = (ids: string[]) => {
    const onChanged = vi.fn();
    render(<SetlistSongsManager setlistId="sl1" memberIds={ids} onChanged={onChanged} />);
    return onChanged;
  };

  it('lists the songs in order; "inactive" songs are treated like any other', async () => {
    renderManager(['2', '5']);
    expect(await screen.findByText(/Songs in this setlist \(2\)/)).toBeTruthy();
    expect(screen.getByText('Echo')).toBeTruthy(); // Echo is inactive in the database
    expect(screen.queryByText(/inactive/i)).toBeNull(); // and nothing warns about it
  });

  it('inactive songs can be added to a setlist like any other song', async () => {
    renderManager([]);
    fireEvent.click(await screen.findByLabelText(/Echo/));
    fireEvent.click(screen.getByRole('button', { name: /add 1 song to setlist/i }));
    await waitFor(() => expect(addSongsToSetlist).toHaveBeenCalledWith('sl1', ['5'], 0));
  });

  it('adds several songs at once at the END of the setlist', async () => {
    const onChanged = renderManager(['2']);
    await screen.findByText('Alpha');
    fireEvent.click(screen.getByRole('button', { name: /select all shown/i }));
    fireEvent.click(screen.getByRole('button', { name: /add 4 songs to setlist/i }));
    await waitFor(() => expect(addSongsToSetlist).toHaveBeenCalled());
    const [id, ids, start] = vi.mocked(addSongsToSetlist).mock.calls[0];
    expect(id).toBe('sl1');
    expect([...ids].sort()).toEqual(['1', '3', '4', '5']);
    expect(start).toBe(1); // after the one already there
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('ticking individual songs adds just those', async () => {
    renderManager([]);
    fireEvent.click(await screen.findByLabelText(/Charlie/));
    fireEvent.click(screen.getByRole('button', { name: /add 1 song to setlist/i }));
    await waitFor(() => expect(addSongsToSetlist).toHaveBeenCalledWith('sl1', ['3'], 0));
  });

  it('search narrows the songs you can add', async () => {
    renderManager([]);
    fireEvent.change(await screen.findByLabelText(/search songs/i), { target: { value: 'brav' } });
    expect(screen.getAllByText('Bravo').length).toBeGreaterThan(0);
    expect(screen.queryByText('Alpha')).toBeNull();
  });

  it('move down / move up reorder and save the new order', async () => {
    renderManager(['1', '2', '3']);
    await screen.findByText(/Songs in this setlist \(3\)/);
    fireEvent.click(screen.getAllByRole('button', { name: /move down/i })[0]);
    await waitFor(() => expect(reorderSetlistSongs).toHaveBeenCalledWith('sl1', ['2', '1', '3']));
    fireEvent.click(screen.getAllByRole('button', { name: /move up/i })[2]);
    await waitFor(() => expect(reorderSetlistSongs).toHaveBeenLastCalledWith('sl1', ['2', '3', '1']));
  });

  it('first song cannot move up; last cannot move down', async () => {
    renderManager(['1', '2']);
    await screen.findByText(/Songs in this setlist \(2\)/);
    expect((screen.getAllByRole('button', { name: /move up/i })[0] as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getAllByRole('button', { name: /move down/i })[1] as HTMLButtonElement).disabled).toBe(true);
  });

  it('remove takes a song out of the setlist (not out of the library)', async () => {
    renderManager(['1', '2']);
    await screen.findByText(/Songs in this setlist \(2\)/);
    fireEvent.click(screen.getAllByRole('button', { name: /remove from setlist/i })[0]);
    await waitFor(() => expect(removeSongFromSetlist).toHaveBeenCalledWith('sl1', '1'));
  });
});

describe('song form (add and edit)', () => {
  it('requires a title and artist', async () => {
    const onSubmit = vi.fn();
    render(<SongForm submitLabel="Add song" onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.submit(screen.getByRole('button', { name: /add song/i }).closest('form')!);
    expect((await screen.findByRole('alert')).textContent).toMatch(/title and artist are required/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('saves trimmed values including lyrics; there is no Active checkbox', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SongForm submitLabel="Save" onSubmit={onSubmit} onCancel={vi.fn()} />);
    expect(screen.queryByRole('checkbox')).toBeNull();
    const [title, artist] = screen.getAllByRole('textbox');
    fireEvent.change(title, { target: { value: '  Perfect  ' } });
    fireEvent.change(artist, { target: { value: ' Ed Sheeran ' } });
    fireEvent.change(screen.getByLabelText(/lyrics with chords/i), { target: { value: '[G]Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      title: 'Perfect', artist: 'Ed Sheeran', lyrics: '[G]Hello', chords: '', is_active: true,
    }));
  });

  it("editing never changes a song's is_active value in the database", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SongForm initial={{ title: 'Old', artist: 'A', lyrics: 'x', chords: '', is_active: false }}
      submitLabel="Save" onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/lyrics with chords/i), { target: { value: 'new words' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ lyrics: 'new words', is_active: false })));
  });

  it('editing starts from the existing values', () => {
    render(<SongForm initial={{ title: 'Old', artist: 'A', lyrics: 'x', chords: 'Capo 1', is_active: true }}
      submitLabel="Save changes" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect((screen.getAllByRole('textbox')[0] as HTMLInputElement).value).toBe('Old');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeTruthy();
  });

  it('preview follows what you type and the Preview button toggles it on a phone', () => {
    render(<SongForm submitLabel="Save" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'My Song' } });
    fireEvent.change(screen.getByLabelText(/lyrics with chords/i), { target: { value: '[Am]Hi' } });
    const preview = document.querySelector('.preview')!;
    expect(preview.textContent).toContain('My Song');
    expect(preview.querySelectorAll('.cl-chord').length).toBe(1);
    expect(preview.classList.contains('is-open')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /^preview$/i }));
    expect(preview.classList.contains('is-open')).toBe(true);
  });

  it('shows the error and keeps your text if saving fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Could not reach the server'));
    render(<SongForm initial={{ title: 'T', artist: 'A', lyrics: 'keep me', chords: '', is_active: true }}
      submitLabel="Save" onSubmit={onSubmit} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not reach/i);
    expect((screen.getByLabelText(/lyrics with chords/i) as HTMLTextAreaElement).value).toBe('keep me');
  });

  it('Cancel calls onCancel', () => {
    const onCancel = vi.fn();
    render(<SongForm submitLabel="Save" onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('setlist form', () => {
  it('needs a name and saves trimmed values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SetlistForm submitLabel="Create setlist" onSubmit={onSubmit} onCancel={vi.fn()} />);
    // a blank-looking name gets past the browser's "required" check but not ours
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /create setlist/i }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/give the setlist a name/i);
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: '  Christmas Event ' } });
    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: ' Dec 20 ' } });
    fireEvent.click(screen.getByRole('button', { name: /create setlist/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Christmas Event', description: 'Dec 20' }));
  });
});

describe('admin sign-in', () => {
  it('signs in with the typed email and password', async () => {
    vi.mocked(signIn).mockResolvedValue(undefined);
    render(<MemoryRouter><LoginForm /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'me@band.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith('me@band.com', 'secret'));
  });
  it('shows the error and lets you retry', async () => {
    vi.mocked(signIn).mockRejectedValue(new Error('Invalid login credentials'));
    render(<MemoryRouter><LoginForm /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'me@band.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/invalid login/i);
    expect((screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement).disabled).toBe(false);
  });
});
