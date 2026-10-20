import { describe, expect, it } from 'vitest';
import { parseChart } from '../lib/chordChart';
import { filterSongs } from '../lib/filterSongs';

const inline = (src: string) => {
  const l = parseChart(src).find((x) => x.kind === 'inline');
  return l && l.kind === 'inline' ? l.segments : [];
};

describe('chord parser', () => {
  it('[Am]inline puts each chord over the syllable it precedes', () => {
    expect(inline('[Am]I walk a [G]lonely road')).toEqual([
      { chord: 'Am', text: 'I walk a ' },
      { chord: 'G', text: 'lonely road' },
    ]);
  });
  it('keeps text before the first chord, and consecutive chords', () => {
    expect(inline('Oh [C][G]yeah')).toEqual([
      { chord: null, text: 'Oh ' },
      { chord: 'C', text: '' },
      { chord: 'G', text: 'yeah' },
    ]);
  });
  it('a chord line above lyrics is merged onto the exact characters it sits over', () => {
    //  columns:  0123456789012345678
    //             Am          G         <- Am at column 3, G at column 15
    //           "I walk a lonely road"
    const segs = inline('   Am          G\nI walk a lonely road');
    expect(segs).toEqual([
      { chord: null, text: 'I w' },
      { chord: 'Am', text: 'alk a lonely' },
      { chord: 'G', text: ' road' },
    ]);
    expect(segs.map((s) => s.text).join('')).toBe('I walk a lonely road'); // nothing lost
  });
  it('recognises real-world chord names', () => {
    for (const c of ['C', 'Am', 'F#m7', 'Bb', 'Cmaj7', 'Gsus4', 'D7sus4', 'Em/G', 'Bm7b5', 'Eadd9', 'Cdim', 'Faug']) {
      const lines = parseChart(`${c}\nsome lyrics`);
      expect(lines[0].kind, c).toBe('inline');
    }
  });
  it('does not mistake lyrics for chords', () => {
    expect(parseChart('Hello darkness my old friend')[0].kind).toBe('text');
    expect(parseChart('Be mine tonight')[0].kind).toBe('text');
  });
  it('detects section headers in both styles', () => {
    expect(parseChart('[Chorus]')[0]).toEqual({ kind: 'section', text: 'Chorus' });
    expect(parseChart('Verse 2:')[0]).toEqual({ kind: 'section', text: 'Verse 2' });
    expect(parseChart('Bridge')[0]).toEqual({ kind: 'section', text: 'Bridge' });
  });
  it('a lone chord line with no lyric under it stays a chord line', () => {
    expect(parseChart('Intro: Am G F C')[0]).toEqual({ kind: 'chords', text: 'Intro:   Am   G   F   C' });
  });
  it('handles Windows line endings and empty input', () => {
    expect(parseChart('[Am]a\r\n\r\n[G]b').map((l) => l.kind)).toEqual(['inline', 'blank', 'inline']);
    expect(parseChart('')).toEqual([{ kind: 'blank' }]);
  });
});

describe('search', () => {
  const songs = [{ title: 'Señorita', artist: 'Shawn' }, { title: 'Perfect', artist: 'Ed Sheeran' }];
  it('matches title or artist, ignoring case and accents', () => {
    expect(filterSongs(songs, 'senorita')).toHaveLength(1);
    expect(filterSongs(songs, 'SHEERAN')).toHaveLength(1);
    expect(filterSongs(songs, '  ')).toHaveLength(2);
    expect(filterSongs(songs, 'zzz')).toHaveLength(0);
  });
});
