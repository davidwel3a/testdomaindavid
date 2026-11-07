-- PostgreSQL schema for an independently branded, rights-cleared listening app.
-- Supabase Auth owns identities; user_id references auth.users(id).
create extension if not exists pgcrypto;

create type media_kind as enum ('track', 'episode');
create type repeat_mode as enum ('off', 'context', 'track');

create table artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  release_date date,
  artwork_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table media_items (
  id uuid primary key default gen_random_uuid(),
  kind media_kind not null default 'track',
  title text not null,
  duration_ms integer not null check (duration_ms > 0),
  explicit boolean not null default false,
  available boolean not null default true,
  album_id uuid references albums(id) on delete set null,
  audio_key text not null,
  artwork_key text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table media_item_artists (
  media_item_id uuid not null references media_items(id) on delete cascade,
  artist_id uuid not null references artists(id) on delete cascade,
  credited_order integer not null default 0 check (credited_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (media_item_id, artist_id)
);

create table playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text not null default '',
  visibility text not null default 'private' check (visibility in ('private', 'unlisted', 'public')),
  collaborative boolean not null default false,
  artwork_key text,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references playlists(id) on delete cascade,
  media_item_id uuid not null references media_items(id) on delete restrict,
  position integer not null check (position >= 0),
  added_by uuid references auth.users(id) on delete set null,
  added_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint playlist_item_position_unique unique (playlist_id, position) deferrable initially deferred
);

create table saved_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  media_item_id uuid not null references media_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, media_item_id)
);

create table playback_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  current_media_item_id uuid references media_items(id) on delete set null,
  context_playlist_id uuid references playlists(id) on delete set null,
  position_ms integer not null default 0 check (position_ms >= 0),
  is_playing boolean not null default false,
  shuffle boolean not null default false,
  repeat repeat_mode not null default 'off',
  device_label text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table queue_items (
  id uuid primary key default gen_random_uuid(),
  playback_session_id uuid not null references playback_sessions(id) on delete cascade,
  media_item_id uuid not null references media_items(id) on delete restrict,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint queue_position_unique unique (playback_session_id, position) deferrable initially deferred
);

create table listening_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_item_id uuid not null references media_items(id) on delete cascade,
  played_at timestamptz not null default now(),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Search and common library/playback lookups.
create index media_items_title_search_idx on media_items using gin (to_tsvector('simple', title));
create index artists_name_search_idx on artists using gin (to_tsvector('simple', name));
create index albums_title_search_idx on albums using gin (to_tsvector('simple', title));
create index media_items_album_idx on media_items (album_id);
create index media_item_artists_artist_idx on media_item_artists (artist_id, media_item_id);
create index playlists_user_updated_idx on playlists (user_id, updated_at desc);
create index playlists_public_updated_idx on playlists (updated_at desc) where visibility = 'public';
create index playlist_items_media_item_idx on playlist_items (media_item_id);
create index saved_items_media_item_idx on saved_items (media_item_id);
create index playback_sessions_user_updated_idx on playback_sessions (user_id, updated_at desc);
create index playback_sessions_current_item_idx on playback_sessions (current_media_item_id);
create index queue_items_media_item_idx on queue_items (media_item_id);
create index listening_history_user_recent_idx on listening_history (user_id, played_at desc);
create index listening_history_media_item_idx on listening_history (media_item_id);

-- Row-level security: public catalog reads are permitted for available items;
-- user-owned library and playback records are visible only to their owner.
alter table artists enable row level security;
alter table albums enable row level security;
alter table media_items enable row level security;
alter table media_item_artists enable row level security;
alter table playlists enable row level security;
alter table playlist_items enable row level security;
alter table saved_items enable row level security;
alter table playback_sessions enable row level security;
alter table queue_items enable row level security;
alter table listening_history enable row level security;

create policy "artists readable" on artists for select using (true);
create policy "albums readable" on albums for select using (true);
create policy "available media readable" on media_items for select using (available);
create policy "media credits readable" on media_item_artists for select using (true);

create policy "playlist owner access" on playlists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "playlist item owner access" on playlist_items for all
  using (exists (select 1 from playlists p where p.id = playlist_id and p.user_id = auth.uid()))
  with check (exists (select 1 from playlists p where p.id = playlist_id and p.user_id = auth.uid()));
create policy "saved item owner access" on saved_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "playback owner access" on playback_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "queue owner access" on queue_items for all
  using (exists (select 1 from playback_sessions s where s.id = playback_session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from playback_sessions s where s.id = playback_session_id and s.user_id = auth.uid()));
create policy "history owner access" on listening_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Do not expose audio_key or artwork_key as public object URLs. A server route
-- should authorize playback and return a short-lived signed URL from storage.
