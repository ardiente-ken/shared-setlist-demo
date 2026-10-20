import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SongViewer from '../components/songs/SongViewer';

const songs = [
  { id: 'a', title: 'First Song', artist: 'AKN', lyrics: '[Verse 1]\n[Am]Hello [G]world', chords: 'Capo 2 · Am G' },
  { id: 'b', title: 'Second Song', artist: 'Ben', lyrics: '   C       F\nSing it loud', chords: '' },
  { id: 'c', title: 'Third Song', artist: 'Cy', lyrics: '[D]Last [A]one', chords: '' },
];

function Harness() {
  const { songId } = useParams();
  const index = Math.max(0, songs.findIndex((s) => s.id === songId));
  return <SongViewer songs={songs} index={index} songPath={(id) => `/s/t/${id}`} backTo="/s/t" />;
}

const setup = (start = 'a') =>
  render(
    <MemoryRouter initialEntries={[`/s/t/${start}`]}>
      <Routes>
        <Route path="/s/t/:songId" element={<Harness />} />
        <Route path="/s/t" element={<div>SETLIST PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );

const title = () => screen.getByRole('heading', { level: 1 }).textContent;
const cl = () => document.querySelector('.cl') as HTMLElement;

/** jsdom can't build real Touch objects, so dispatch plain events carrying the coordinates. */
function touch(el: Element, type: 'touchstart' | 'touchend', x: number, y: number) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(ev, { touches: type === 'touchend' ? [] : [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }] });
  act(() => {
    el.dispatchEvent(ev);
  });
}
const swipe = (from: [number, number], to: [number, number]) => {
  const el = screen.getByRole('heading', { level: 1 });
  touch(el, 'touchstart', ...from);
  touch(el, 'touchend', ...to);
};

describe('reader: showing a song', () => {
  it('shows title, artist, capo line, position and the chords over the words', () => {
    setup('a');
    expect(title()).toBe('First Song');
    expect(screen.getByText('AKN')).toBeTruthy();
    expect(screen.getByText('Capo 2 · Am G')).toBeTruthy();
    expect(screen.getByText('1 / 3')).toBeTruthy();
    expect(document.querySelectorAll('.cl-chord').length).toBe(2);
  });
});

describe('reader: Prev / Next buttons', () => {
  it('Next goes forward and Prev goes back', () => {
    setup('a');
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(title()).toBe('Second Song');
    expect(screen.getByText('2 / 3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /prev/i }));
    expect(title()).toBe('First Song');
  });
  it('Prev is disabled on the first song and Next on the last', () => {
    setup('a');
    expect((screen.getByRole('button', { name: /prev/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /next/i }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(title()).toBe('Third Song');
    expect((screen.getByRole('button', { name: /next/i }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('scrolls back to the top when the song changes', () => {
    setup('a');
    (window.scrollTo as unknown as ReturnType<typeof import('vitest').vi.fn>).mockClear();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(window.scrollTo).toHaveBeenCalled();
  });
});

describe('reader: swipe', () => {
  it('swipe left = next song, swipe right = previous song', () => {
    setup('b');
    swipe([300, 200], [100, 205]);
    expect(title()).toBe('Third Song');
    swipe([100, 200], [300, 205]);
    expect(title()).toBe('Second Song');
  });
  it('ignores a mostly-vertical scroll and a tiny movement', () => {
    setup('b');
    swipe([200, 100], [150, 500]); // scrolling down
    expect(title()).toBe('Second Song');
    swipe([200, 200], [180, 200]); // too short
    expect(title()).toBe('Second Song');
  });
  it('does not swipe past the ends', () => {
    setup('a');
    swipe([100, 200], [300, 200]); // right on first song
    expect(title()).toBe('First Song');
  });
});

describe('reader: keyboard', () => {
  it('arrow keys turn songs', () => {
    setup('a');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(title()).toBe('Second Song');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(title()).toBe('First Song');
  });
});

describe('reader: text size', () => {
  it('A+ makes text bigger and A− smaller, and it is remembered', () => {
    setup('a');
    const start = parseInt(cl().style.getPropertyValue('--cl-size'));
    fireEvent.click(screen.getByRole('button', { name: /larger text/i }));
    expect(parseInt(cl().style.getPropertyValue('--cl-size'))).toBe(start + 2);
    fireEvent.click(screen.getByRole('button', { name: /smaller text/i }));
    fireEvent.click(screen.getByRole('button', { name: /smaller text/i }));
    expect(parseInt(cl().style.getPropertyValue('--cl-size'))).toBe(start - 2);
    expect(localStorage.getItem('shared-setlist.fontSize')).toBe(String(start - 2));
  });
  it('stops at the limits (buttons disable)', () => {
    setup('a');
    const bigger = screen.getByRole('button', { name: /larger text/i }) as HTMLButtonElement;
    for (let i = 0; i < 20; i++) fireEvent.click(bigger);
    expect(bigger.disabled).toBe(true);
    const smaller = screen.getByRole('button', { name: /smaller text/i }) as HTMLButtonElement;
    for (let i = 0; i < 30; i++) fireEvent.click(smaller);
    expect(smaller.disabled).toBe(true);
  });
  it('a saved size is used on the next visit', () => {
    localStorage.setItem('shared-setlist.fontSize', '28');
    setup('a');
    expect(cl().style.getPropertyValue('--cl-size')).toBe('28px');
  });
});

describe('reader: chords on/off', () => {
  it('hides and shows chords (and the capo line)', () => {
    setup('a');
    const btn = screen.getByRole('button', { name: /chords/i });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelectorAll('.cl-chord').length).toBe(0);
    expect(screen.queryByText('Capo 2 · Am G')).toBeNull();
    expect(screen.getByText(/Hello/)).toBeTruthy(); // lyrics stay
    fireEvent.click(btn);
    expect(document.querySelectorAll('.cl-chord').length).toBe(2);
  });
});

describe('reader: light / dark', () => {
  it('toggles the theme on <html> and remembers it', () => {
    document.documentElement.dataset.theme = 'light';
    setup('a');
    fireEvent.click(screen.getByRole('button', { name: /dark mode/i }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('shared-setlist.theme')).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: /light mode/i }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

describe('reader: back to the setlist', () => {
  it('the back button returns to the song list', () => {
    setup('a');
    const back = screen.getByRole('link', { name: /back to setlist/i });
    expect(back.getAttribute('href')).toBe('/s/t');
    fireEvent.click(back);
    expect(screen.getByText('SETLIST PAGE')).toBeTruthy();
  });
});
