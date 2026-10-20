-- =====================================================================
-- AKN Gigs: database schema snapshot
-- Source: live Supabase project "akn-live-setlist" (wxquotmrxnhzbnfihomi)
-- Captured: 2026-10-14, updated with the song-request toggle and song folders / public songbooks.
-- Schema only: no rows (songs, requests, admins are not included; app_settings is seeded).
--
-- Re-create on a new project: Supabase -> SQL Editor -> paste all -> Run.
-- Idempotent: safe to re-run (tables/columns use IF NOT EXISTS; policies,
-- triggers are dropped and re-created).
--
-- After running, make yourself admin (see section 9).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. songs
-- ---------------------------------------------------------------------
create table if not exists public.songs (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  artist     text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  lyrics     text not null default '',
  chords     text not null default '',
  updated_at timestamptz not null default now()
);

-- (for projects that already had the original 5-column songs table)
alter table public.songs
  add column if not exists lyrics     text        not null default '',
  add column if not exists chords     text        not null default '',
  add column if not exists updated_at timestamptz not null default now();

create index if not exists songs_active_idx on public.songs (is_active);

-- ---------------------------------------------------------------------
-- 2. admins  (allow-list of users who can manage songs and the queue)
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id)
);

-- ---------------------------------------------------------------------
-- 3. functions + triggers
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists songs_set_updated_at on public.songs;
create trigger songs_set_updated_at
  before update on public.songs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. song_requests
-- ---------------------------------------------------------------------
create table if not exists public.song_requests (
  id             uuid primary key default gen_random_uuid(),
  song_id        uuid references public.songs(id),
  title          text not null check (char_length(title) between 1 and 120),
  artist         text not null default '' check (char_length(artist) <= 120),
  requester_name text not null default '' check (char_length(requester_name) <= 40),
  status         text not null default 'pending'
                   check (status in ('pending', 'played', 'dismissed')),
  created_at     timestamptz not null default now(),
  handled_at     timestamptz
);

create index if not exists song_requests_status_created_idx
  on public.song_requests (status, created_at);

-- ---------------------------------------------------------------------
-- 4b. app_settings + requests_open()  (global song-request on/off switch)
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  constraint app_settings_requests_enabled_is_boolean
    check (key <> 'requests_enabled' or jsonb_typeof(value) = 'boolean')
);

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Seed: requests OPEN. Never overwrites an existing value.
insert into public.app_settings (key, value)
values ('requests_enabled', 'true'::jsonb)
on conflict (key) do nothing;

-- Server-side check used by the song_requests insert policy. Fails CLOSED if
-- the row is ever missing.
create or replace function public.requests_open()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select (value #>> '{}')::boolean from public.app_settings where key = 'requests_enabled'),
    false
  );
$$;

-- ---------------------------------------------------------------------
-- 4c. folders + folder_songs  (collections like "Christmas Event")
-- ---------------------------------------------------------------------
create table if not exists public.folders (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  slug        text not null unique
                check (char_length(slug) <= 60 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 300),
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  share_token text unique check (share_token is null or share_token ~ '^[a-z0-9]{20,64}$')
);

-- (for projects that already had folders without share links)
alter table public.folders
  add column if not exists share_token text unique
    check (share_token is null or share_token ~ '^[a-z0-9]{20,64}$');

drop trigger if exists folders_set_updated_at on public.folders;
create trigger folders_set_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();

-- A song can be in many folders; position = its order inside that folder.
create table if not exists public.folder_songs (
  folder_id uuid not null references public.folders(id) on delete cascade,
  song_id   uuid not null references public.songs(id)   on delete cascade,
  position  integer not null default 0,
  added_at  timestamptz not null default now(),
  primary key (folder_id, song_id)
);

create index if not exists folder_songs_song_idx on public.folder_songs (song_id);

-- Public read access goes ONLY through these two functions (security definer):
-- they expose public folders and their ACTIVE songs, nothing else.
create or replace function public.get_public_folder(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'folder', jsonb_build_object(
      'id', f.id, 'name', f.name, 'slug', f.slug, 'description', f.description
    ),
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
      where fs.folder_id = f.id and s.is_active
    ), '[]'::jsonb)
  )
  from public.folders f
  where f.slug = p_slug and f.is_public;
$$;

create or replace function public.list_public_folders()
returns table (id uuid, name text, slug text, description text, song_count integer)
language sql
stable
security definer
set search_path to 'public'
as $$
  select f.id, f.name, f.slug, f.description,
         (select count(*)::int
            from public.folder_songs fs
            join public.songs s on s.id = fs.song_id
           where fs.folder_id = f.id and s.is_active)
    from public.folders f
   where f.is_public
   order by f.name;
$$;

revoke all on function public.get_public_folder(text) from public;
revoke all on function public.list_public_folders()   from public;
grant execute on function public.get_public_folder(text) to anon, authenticated;
grant execute on function public.list_public_folders()   to anon, authenticated;

-- shared-setlist app: ONE setlist (folder) + ALL its songs (is_active ignored) for an exact share token.
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

-- ---------------------------------------------------------------------
-- 5. Row level security: ON for every table
-- ---------------------------------------------------------------------
alter table public.songs         enable row level security;
alter table public.admins        enable row level security;
alter table public.song_requests enable row level security;
alter table public.app_settings  enable row level security;
alter table public.folders       enable row level security;
alter table public.folder_songs  enable row level security;

-- ---------------------------------------------------------------------
-- 6. Grants (least privilege)
--    Supabase grants ALL privileges on new public tables to anon and
--    authenticated by default; RLS is then the only gate. This tightens it
--    to exactly what the app uses. Safe to run on the live project too.
-- ---------------------------------------------------------------------
revoke all on public.songs, public.admins, public.song_requests, public.app_settings,
              public.folders, public.folder_songs from anon, authenticated;

grant select                         on public.songs         to anon;
grant select, insert, update, delete on public.songs         to authenticated;
grant select                         on public.admins        to authenticated;
grant select, insert                 on public.song_requests to anon;
grant select, insert, update, delete on public.song_requests to authenticated;
grant select                         on public.app_settings  to anon;
grant select, insert, update         on public.app_settings  to authenticated;
grant select, insert, update, delete on public.folders       to authenticated;
grant select, insert, update, delete on public.folder_songs  to authenticated;

-- ---------------------------------------------------------------------
-- 7. Policies
-- ---------------------------------------------------------------------

-- songs: public reads active songs; admins have full access
drop policy if exists "Public can read active songs" on public.songs;
create policy "Public can read active songs"
  on public.songs for select to anon
  using (is_active = true);

drop policy if exists "Admins can read all songs" on public.songs;
create policy "Admins can read all songs"
  on public.songs for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can insert songs" on public.songs;
create policy "Admins can insert songs"
  on public.songs for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update songs" on public.songs;
create policy "Admins can update songs"
  on public.songs for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete songs" on public.songs;
create policy "Admins can delete songs"
  on public.songs for delete to authenticated
  using (public.is_admin());

-- admins: a signed-in user can see only their own row
drop policy if exists "Admins can read own row" on public.admins;
create policy "Admins can read own row"
  on public.admins for select to authenticated
  using (user_id = auth.uid());

-- song_requests: anyone reads (needed for realtime) and creates pending
-- requests ONLY WHILE REQUESTS ARE OPEN (queue capped at 100 pending);
-- only admins update/delete (so they can still manage the queue when closed)
drop policy if exists "Anyone can read requests" on public.song_requests;
create policy "Anyone can read requests"
  on public.song_requests for select to anon, authenticated
  using (true);

drop policy if exists "Anyone can create pending requests" on public.song_requests;
create policy "Anyone can create pending requests"
  on public.song_requests for insert to anon, authenticated
  with check (
    public.requests_open()
    and status = 'pending'
    and handled_at is null
    and (select count(*) from public.song_requests where status = 'pending') < 100
  );

drop policy if exists "Admins can update requests" on public.song_requests;
create policy "Admins can update requests"
  on public.song_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete requests" on public.song_requests;
create policy "Admins can delete requests"
  on public.song_requests for delete to authenticated
  using (public.is_admin());

-- app_settings: everyone may READ the request-availability flag (home page +
-- realtime); only admins may change it. Don't store secrets in this table.
drop policy if exists "Public can read request availability" on public.app_settings;
create policy "Public can read request availability"
  on public.app_settings for select to anon, authenticated
  using (key = 'requests_enabled');

drop policy if exists "Admins can insert settings" on public.app_settings;
create policy "Admins can insert settings"
  on public.app_settings for insert to authenticated
  with check (public.is_admin() and key = 'requests_enabled');

drop policy if exists "Admins can update settings" on public.app_settings;
create policy "Admins can update settings"
  on public.app_settings for update to authenticated
  using (public.is_admin() and key = 'requests_enabled')
  with check (public.is_admin() and key = 'requests_enabled');

-- folders + folder_songs: admins only. Anonymous users have NO direct access;
-- the public songbook uses get_public_folder() / list_public_folders().
drop policy if exists "Admins can manage folders" on public.folders;
create policy "Admins can manage folders"
  on public.folders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can manage folder songs" on public.folder_songs;
create policy "Admins can manage folder songs"
  on public.folder_songs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 8. Realtime (live request queue + open/closed flag). Replica identity stays DEFAULT.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'song_requests'
  ) then
    alter publication supabase_realtime add table public.song_requests;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_settings'
  ) then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 9. Make yourself admin (once, per project)
--    a) Dashboard -> Authentication -> Users -> Add user (email + password)
--    b) Uncomment, put your email in, run:
-- ---------------------------------------------------------------------
-- insert into public.admins (user_id)
--   select id from auth.users where email = 'YOUR_EMAIL_HERE'
--   on conflict do nothing;
