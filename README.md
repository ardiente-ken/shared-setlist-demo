# Shared Setlist

A small app with **two actors**:

1. **Admin** signs in, manages songs (lyrics + chords) and builds **setlists**, then creates a **share link**.
2. **Anyone with the link** (no sign-in) sees the setlist, taps a song, and reads the chords over the lyrics. Prev/Next buttons,
   swipe or arrow keys move through the setlist; A−/A+ change the text size, Chords hides or shows the chords, and a
   light/dark switch is remembered on their device.

It uses the **same Supabase database** as the AKN Gigs website. A *setlist* is a row in the existing
`folders` table; its songs are in `folder_songs`; songs live in `songs`; admins are in `admins`.

## Run it

```bash
npm install
cp .env.example .env      # then fill in VITE_SUPABASE_ANON_KEY (same value as the AKN Gigs website)
npm run dev
```

`npm run build` type-checks and produces `dist/`. Hosting needs a "send everything to index.html" rewrite
so `/s/<token>` and `/admin` survive a refresh. `public/_redirects` (Netlify) and `vercel.json` (Vercel) are included.

## Database (one-time)

The AKN Gigs schema must already exist (`supabase/schema.sql` is a full copy, safe to re-run).
This app adds one thing: `supabase/001_share_links.sql` (a `share_token` column and the
`get_shared_setlist()` function). Run it in the Supabase SQL Editor. Then make yourself admin once:

```sql
insert into public.admins (user_id)
  select id from auth.users where email = 'YOU@EXAMPLE.COM' on conflict do nothing;
```

## Routes

| Route | Who | What |
|---|---|---|
| `/` | everyone | landing |
| `/s/:token` | anyone with the link | the shared setlist (song list) |
| `/s/:token/:songId` | anyone with the link | chord sheet, swipe through the setlist |
| `/admin` | admin | setlists: create, edit, add/reorder songs, share |
| `/admin/songs` | admin | songs: add, edit, delete, search |

## How sharing is secured

- A share link is `/s/<32 random hex characters>` (128 bits). It is **not** derived from the setlist name and cannot be guessed.
- Anonymous users have **no direct access** to any table. They can only call `get_shared_setlist(token)`,
  which returns that one setlist and **all** its songs (a song's `is_active` flag doesn't matter here), and `null` for any wrong, empty or revoked token.
- **New link** replaces the token (the old link dies). **Stop sharing** clears it (the link dies immediately).
- Only users listed in `admins` can create or change songs, setlists and links (Row Level Security).
- Only the public **anon** key is used in the browser. Never put the service-role key in this app.
- The app sends `noindex` so search engines don't list shared pages.

## The look

Deliberately plain: system fonts (nothing to download), one accent color, light and dark mode, and big tap targets
(44px+). It is **phone-first**: the base styles are for a phone and wider screens just get more room. Colors are the
variables at the top of `src/index.css`; the reader is `src/styles/viewer.css`, the admin is `src/styles/admin.css`.

## Chord format

In a song's *Lyrics with chords* box, either style works (and they can be mixed):

```
[Verse 1]
[Am]I walk a lonely [G]road

   Am          G
I walk a lonely road
```

Section headers like `[Chorus]` or `Verse 1` are detected; choruses get an accent bar.

## Tests

`npm test` runs 73 automated tests that click, swipe and type through the controls the way a person would:

- **Reader:** Next/Prev (and disabled at the ends), swipe left/right (and ignoring vertical scrolling), arrow keys,
  A−/A+ (with limits and remembering), chords on/off, light/dark, Back to the setlist.
- **Share link flow:** open a link, tap a song, move through the setlist, bad or revoked links, search, and the
  weak-signal "last saved copy" fallback.
- **Admin:** create / copy / replace / stop a share link (with confirmations), add many songs at once, reorder,
  remove, the song and setlist forms (validation, trimming, preview), and sign-in.
- **Database calls:** the exact requests sent (random 128-bit tokens, `is_public` always false, positions, deletes
  only touching the right table) and the chord parser.

## Layout

```
src/
  lib/         supabase client, chord parser, token + slug helpers
  models/      Song, Setlist types
  services/    ALL database access (songService, setlistService, sharedService, authService)
  hooks/       useAuth, useSongs, useSetlists, useSharedSetlist, useSwipe, ...
  components/  songs/ (chord sheet, viewer, form), setlists/ (form, share panel, song picker), admin/
  pages/       admin/ (actor 1), shared/ (actor 2)
```
