/**
 * Parses a song "chart" into renderable lines. Two input styles are supported
 * and can be mixed:
 *   1. Inline (ChordPro):      [Am]I walk a [G]lonely road
 *   2. Chords above lyrics:       Am        G
 *                              I walk a lonely road
 * Both end up as "inline" lines (chord stacked over the syllable it belongs to),
 * so they wrap nicely and scale to any font size.
 */
export interface Segment {
  chord: string | null;
  text: string;
}

export type ChartLine =
  | { kind: 'blank' }
  | { kind: 'section'; text: string }
  | { kind: 'inline'; segments: Segment[] }
  | { kind: 'chords'; text: string }
  | { kind: 'text'; text: string };

const CHORD =
  /^[A-G][#b]?(?:maj|min|m|M|dim|aug|sus|add)?\d*(?:(?:sus|add|maj|b|#)?\d+)*(?:\/[A-G][#b]?)?$/;
const FILLER = /^(?:x\d+|\||\|\||-|–|\/|N\.?C\.?|\(.*\)|\.\.\.)$/i;
const SECTION_WORD =
  /^(?:intro|verse|pre-?chorus|chorus|bridge|outro|interlude|solo|instrumental|tag|refrain|break)\b[\s\d]*:?$/i;
const HAS_BRACKET = /\[[^\]]+\]/;

const isChord = (t: string) => CHORD.test(t);

function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens[0].endsWith(':')) tokens.shift(); // "Intro: Am G"
  if (tokens.length === 0) return false;
  let chords = 0;
  for (const t of tokens) {
    if (isChord(t)) chords++;
    else if (!FILLER.test(t)) return false;
  }
  return chords > 0;
}

function asSection(line: string): string | null {
  const t = line.trim();
  const bracket = t.match(/^\[([^\]]+)\]:?$/);
  if (bracket && !isChord(bracket[1].trim())) return bracket[1].trim();
  if (SECTION_WORD.test(t)) return t.replace(/:$/, '');
  return null;
}

function parseInline(line: string): Segment[] {
  const segs: Segment[] = [];
  const re = /\[([^\]]+)\]/g;
  let last = 0;
  let pending: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const text = line.slice(last, m.index);
    if (pending !== null || text) segs.push({ chord: pending, text });
    pending = m[1].trim();
    last = m.index + m[0].length;
  }
  segs.push({ chord: pending, text: line.slice(last) });
  return segs;
}

function mergeChordsOverLyric(chordLine: string, lyric: string): Segment[] {
  const found: { chord: string; col: number }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(chordLine))) found.push({ chord: m[0], col: m.index });

  const padded = lyric.padEnd(found[found.length - 1].col + 1);
  const segs: Segment[] = [];
  if (found[0].col > 0) segs.push({ chord: null, text: padded.slice(0, found[0].col) });
  found.forEach((f, i) => {
    const end = i + 1 < found.length ? found[i + 1].col : padded.length;
    const text = padded.slice(f.col, end);
    segs.push({ chord: f.chord, text: text.trim() ? text : '' });
  });
  return segs;
}

function isLyricLine(line: string): boolean {
  return line.trim() !== '' && !asSection(line) && !HAS_BRACKET.test(line) && !isChordLine(line);
}

export function parseChart(source: string): ChartLine[] {
  const raw = source.replace(/\r\n?/g, '\n').split('\n');
  const out: ChartLine[] = [];
  for (let i = 0; i < raw.length; i++) {
    const line = raw[i];
    if (!line.trim()) {
      out.push({ kind: 'blank' });
      continue;
    }
    const section = asSection(line);
    if (section) {
      out.push({ kind: 'section', text: section });
      continue;
    }
    if (HAS_BRACKET.test(line)) {
      out.push({ kind: 'inline', segments: parseInline(line) });
      continue;
    }
    if (isChordLine(line)) {
      const next = raw[i + 1];
      if (next !== undefined && isLyricLine(next)) {
        out.push({ kind: 'inline', segments: mergeChordsOverLyric(line, next) });
        i++;
      } else {
        out.push({ kind: 'chords', text: line.trim().split(/\s+/).join('   ') });
      }
      continue;
    }
    out.push({ kind: 'text', text: line.trimEnd() });
  }
  return out;
}
