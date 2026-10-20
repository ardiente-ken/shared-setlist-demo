interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SongSearch({ value, onChange, placeholder = 'Search title or artist…' }: Props) {
  return (
    <div className="search">
      <input
        className="input"
        type="text"
        inputMode="search"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        aria-label="Search songs"
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange('')}>×</button>
      )}
    </div>
  );
}
