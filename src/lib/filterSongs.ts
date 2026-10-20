/** Case- and accent-insensitive search on title + artist. */
const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function filterSongs<T extends { title: string; artist: string }>(songs: T[], query: string): T[] {
  const q = norm(query);
  if (!q) return songs;
  return songs.filter((s) => norm(`${s.title} ${s.artist}`).includes(q));
}
