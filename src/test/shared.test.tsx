import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import type { SharedSetlist } from '../models/setlist';

vi.mock('../services/sharedService', () => ({ getSharedSetlist: vi.fn() }));
import { getSharedSetlist } from '../services/sharedService';

const mocked = vi.mocked(getSharedSetlist);

const mk = (n: number): SharedSetlist => ({
  folder: { id: 'f', name: 'Christmas Event', description: 'Dec 20 · Cebu City' },
  songs: Array.from({ length: n }, (_, i) => ({
    id: `s${i + 1}`, title: `Song ${i + 1}`, artist: i % 2 ? 'Ben' : 'AKN',
    lyrics: `[Am]Line ${i + 1} [G]here`, chords: i === 0 ? 'Capo 2' : '', position: i,
  })),
});

const open = (path: string) =>
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

beforeEach(() => {
  mocked.mockClear(); // braces on purpose: a returned function would be run as a cleanup hook
});

describe('opening a share link', () => {
  it('shows the setlist: name, note, count, songs in order with their numbers', async () => {
    mocked.mockResolvedValue(mk(3));
    open('/s/tok');
    expect((await screen.findAllByText('Christmas Event')).length).toBeGreaterThan(0);
    expect(screen.getByText('Dec 20 · Cebu City')).toBeTruthy();
    expect(screen.getByText('3 songs')).toBeTruthy();
    const links = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/s/tok/'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/s/tok/s1', '/s/tok/s2', '/s/tok/s3']);
    expect(mocked).toHaveBeenCalledWith('tok');
  });

  it('tapping a song opens its chord sheet; Next/Prev/Back work through the whole flow', async () => {
    mocked.mockResolvedValue(mk(3));
    open('/s/tok');
    fireEvent.click(await screen.findByText('Song 2'));
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Song 2');
    expect(screen.getByText('2 / 3')).toBeTruthy();
    expect(document.querySelectorAll('.cl-chord').length).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Song 3');
    fireEvent.click(screen.getByRole('button', { name: /prev/i }));
    fireEvent.click(screen.getByRole('button', { name: /prev/i }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Song 1');
    expect(screen.getByText('Capo 2')).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: /back to setlist/i }));
    expect(await screen.findByText('3 songs')).toBeTruthy();
  });

  it('a song link opened directly (e.g. shared from the chat) works', async () => {
    mocked.mockResolvedValue(mk(3));
    open('/s/tok/s3');
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Song 3');
  });

  it('search filters the list (shown for longer setlists) and keeps real song numbers', async () => {
    mocked.mockResolvedValue(mk(9));
    open('/s/tok');
    const box = await screen.findByLabelText(/search songs/i);
    fireEvent.change(box, { target: { value: 'song 7' } });
    expect(screen.getByText('Song 7')).toBeTruthy();
    expect(screen.queryByText('Song 2')).toBeNull();
    expect(screen.getByText('7')).toBeTruthy(); // its place in the setlist, not "1"
    fireEvent.change(box, { target: { value: 'zzz' } });
    expect(screen.getByText('No songs match.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }));
    expect(screen.getByText('Song 2')).toBeTruthy();
  });

  it('search is accent- and case-insensitive', async () => {
    const data = mk(8);
    data.songs[0].title = 'Señorita Café';
    mocked.mockResolvedValue(data);
    open('/s/tok');
    fireEvent.change(await screen.findByLabelText(/search songs/i), { target: { value: 'SENORITA cafe' } });
    expect(screen.getByText('Señorita Café')).toBeTruthy();
  });
});

describe('bad / revoked links', () => {
  it('shows a friendly message and no songs', async () => {
    mocked.mockResolvedValue(null);
    open('/s/not-a-real-link');
    expect(await screen.findByText(/isn't valid, or sharing was turned off/i)).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('a previously cached copy is cleared once the link is revoked', async () => {
    localStorage.setItem('shared-setlist.tok.v1', JSON.stringify(mk(2)));
    mocked.mockResolvedValue(null);
    open('/s/tok');
    await waitFor(() => expect(screen.getByText(/isn't valid, or sharing was turned off/i)).toBeTruthy());
    expect(localStorage.getItem('shared-setlist.tok.v1')).toBeNull();
  });
});

describe('weak signal', () => {
  it('shows the last saved copy with an offline notice, and caches fresh loads', async () => {
    localStorage.setItem('shared-setlist.tok.v1', JSON.stringify(mk(2)));
    mocked.mockImplementation(async () => {
      throw new Error('network down');
    });
    open('/s/tok');
    expect(await screen.findByText(/offline: showing the last saved copy/i)).toBeTruthy();
    expect(screen.getByText('Song 2')).toBeTruthy();
  });

  it('saves a good load for next time', async () => {
    mocked.mockResolvedValue(mk(2));
    open('/s/tok');
    await screen.findByText('Song 1');
    expect(JSON.parse(localStorage.getItem('shared-setlist.tok.v1')!).songs).toHaveLength(2);
  });
});

describe('routes', () => {
  it('home and unknown pages render', () => {
    open('/');
    expect(screen.getByRole('link', { name: /admin sign in/i }).getAttribute('href')).toBe('/admin');
  });
  it('unknown URL shows not found', () => {
    open('/nope/nothing');
    expect(screen.getByText(/page not found/i)).toBeTruthy();
  });
});
