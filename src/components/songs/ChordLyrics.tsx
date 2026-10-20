import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { parseChart } from '../../lib/chordChart';
import type { ChartLine } from '../../lib/chordChart';
import './ChordLyrics.css';

interface Props {
  /** Lyrics text, with chords inline [Am] or on a line above the lyric. */
  source: string;
  fontSize?: number;
  showChords?: boolean;
}

interface Block {
  label: string | null;
  chorus: boolean;
  lines: ChartLine[];
}

/** Groups lines into labelled sections (Verse, Chorus, ...). */
function toBlocks(lines: ChartLine[]): Block[] {
  const blocks: Block[] = [];
  let cur: Block = { label: null, chorus: false, lines: [] };
  const flush = () => {
    while (cur.lines.length && cur.lines[cur.lines.length - 1].kind === 'blank') cur.lines.pop();
    if (cur.label !== null || cur.lines.length) blocks.push(cur);
  };
  for (const l of lines) {
    if (l.kind === 'section') {
      flush();
      cur = { label: l.text, chorus: /chorus|refrain/i.test(l.text), lines: [] };
    } else if (l.kind === 'blank' && cur.lines.length === 0) {
      continue;
    } else {
      cur.lines.push(l);
    }
  }
  flush();
  return blocks;
}

export default function ChordLyrics({ source, fontSize = 24, showChords = true }: Props) {
  const blocks = useMemo(() => toBlocks(parseChart(source)), [source]);

  if (!source.trim()) return <p className="cl-empty">No lyrics added yet.</p>;

  const renderLine = (line: ChartLine, i: number) => {
    switch (line.kind) {
      case 'blank':
        return <div className="cl-blank" key={i} />;
      case 'chords':
        return showChords ? <div className="cl-chords-line" key={i}>{line.text}</div> : null;
      case 'text':
        return <div className="cl-text" key={i}>{line.text}</div>;
      case 'inline':
        return (
          <div className="cl-inline" key={i}>
            {line.segments.map((s, j) => (
              <span className="cl-seg" key={j}>
                {showChords && <span className="cl-chord">{s.chord ?? ''}</span>}
                <span className="cl-lyric">{s.text}</span>
              </span>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="cl" style={{ '--cl-size': `${fontSize}px` } as CSSProperties}>
      {blocks.map((b, i) => (
        <section className={`cl-block ${b.chorus ? 'cl-chorus' : ''}`} key={i}>
          {b.label !== null && <div className="cl-section">{b.label}</div>}
          {b.lines.map(renderLine)}
        </section>
      ))}
    </div>
  );
}
