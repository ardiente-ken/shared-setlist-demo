-- shared-setlist: unguessable share links for setlists (rows of the shared `folders` table).
-- Additive and idempotent. Requires the existing AKN Gigs schema (see schema.sql).

alter table public.folders
  add column if not exists share_token text unique
    check (share_token is null or share_token ~ '^[a-z0-9]{20,64}$');

-- Anyone holding the link can read that ONE setlist and ALL its songs (is_active is ignored here).
-- Reachable only by exact token; tokens are never listed or exposed to anonymous users
-- (anonymous users have no direct access to the folders table at all).
create or replace function public.get_shared_setlist(p_token text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'folder', jsonb_build_object('id', f.id, 'name', f.name, 'description', f.description),
    'songs', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id, 'title', s.title, 'artist', s.artist,
          'lyrics', s.lyrics, 'chords', s.chords, 'position', fs.position
        )
        order by fs.position, s.title
      )
      from public.folder_songs fs
      join public.songs s on s.id = fs.song_id
      where fs.folder_id = f.id
    ), '[]'::jsonb)
  )
  from public.folders f
  where p_token is not null and f.share_token = p_token;
$$;

revoke all on function public.get_shared_setlist(text) from public;
grant execute on function public.get_shared_setlist(text) to anon, authenticated;
