import { generateToken } from './token';

/** "Christmas Event 🎄" -> "christmas-event" */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

/** The database requires a unique slug per folder; users never see it. */
export function uniqueSlug(name: string): string {
  return `${slugify(name) || 'setlist'}-${generateToken(3)}`;
}
