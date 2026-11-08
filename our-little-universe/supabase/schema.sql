-- ============================================================
-- OUR LITTLE UNIVERSE — Supabase / PostgreSQL schema
-- Jalankan seluruh file ini di Supabase > SQL Editor (sekali).
-- Isolasi data pasangan dijamin oleh Row Level Security (RLS),
-- bukan oleh UI.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Tabel inti ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Kamu',
  avatar_path text,
  birthday date,
  theme text not null default 'kawaii',
  prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Little Universe',
  anniversary date,
  cover_path text,
  description text,
  theme text not null default 'kawaii',
  favorite_color text default '#ff9ec7',
  invite_code text unique not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- user_id unique => satu akun hanya boleh masuk satu pasangan
create table if not exists public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

-- ---------- Helper keamanan ----------
create or replace function public.is_member(cid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from couple_members where couple_id = cid and user_id = auth.uid());
$$;

create or replace function public.my_couple_id()
returns uuid language sql security definer stable set search_path = public as $$
  select couple_id from couple_members where user_id = auth.uid() limit 1;
$$;

-- ---------- RPC: buat & gabung pasangan ----------
create or replace function public.create_couple(p_name text, p_anniversary date)
returns public.couples language plpgsql security definer set search_path = public as $$
declare c couples; code text;
begin
  if auth.uid() is null then raise exception 'Belum login'; end if;
  if exists (select 1 from couple_members where user_id = auth.uid()) then
    raise exception 'Kamu sudah tergabung di sebuah pasangan';
  end if;
  loop
    code := upper(substr(replace(encode(gen_random_bytes(6),'hex'),'0','7'),1,8));
    exit when not exists (select 1 from couples where invite_code = code);
  end loop;
  insert into couples(name, anniversary, invite_code, created_by)
    values (coalesce(nullif(p_name,''),'Our Little Universe'), p_anniversary, code, auth.uid())
    returning * into c;
  insert into couple_members(couple_id, user_id) values (c.id, auth.uid());
  return c;
end $$;

create or replace function public.join_couple(p_code text)
returns public.couples language plpgsql security definer set search_path = public as $$
declare c couples; n int;
begin
  if auth.uid() is null then raise exception 'Belum login'; end if;
  if exists (select 1 from couple_members where user_id = auth.uid()) then
    raise exception 'Kamu sudah tergabung di sebuah pasangan';
  end if;
  select * into c from couples where invite_code = upper(trim(p_code));
  if not found then raise exception 'Kode undangan tidak ditemukan'; end if;
  select count(*) into n from couple_members where couple_id = c.id;
  if n >= 2 then raise exception 'Ruang ini sudah berisi dua orang'; end if;
  insert into couple_members(couple_id, user_id) values (c.id, auth.uid());
  insert into notifications(couple_id, to_user, kind, title, body)
    select c.id, user_id, 'joined', 'Pasanganmu bergabung ♡', 'Universe kalian sekarang lengkap!'
    from couple_members where couple_id = c.id and user_id <> auth.uid();
  return c;
end $$;

create or replace function public.delete_couple_space()
returns void language plpgsql security definer set search_path = public as $$
declare cid uuid := my_couple_id();
begin
  if cid is null then return; end if;
  delete from couples where id = cid;  -- cascade ke semua data pasangan
end $$;

-- Hapus data pribadi + keluar dari pasangan. Penghapusan baris auth.users
-- sendiri membutuhkan service role (lihat README: Edge Function opsional).
create or replace function public.delete_my_data()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from couple_members where user_id = auth.uid();
  delete from profiles where id = auth.uid();
end $$;

-- ---------- Tabel fitur (semua punya couple_id) ----------
create table if not exists public.memory_folders (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  title text not null, description text, event_date date, location text,
  cover_path text, created_at timestamptz not null default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  folder_id uuid references public.memory_folders(id) on delete cascade,
  kind text not null default 'photo' check (kind in ('photo','video')),
  path text not null, caption text, story text,
  taken_on date, sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.scrapbooks (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  title text not null, cover text, created_at timestamptz not null default now()
);

create table if not exists public.scrapbook_pages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  scrapbook_id uuid not null references public.scrapbooks(id) on delete cascade,
  page_no int not null default 1,
  bg text default 'cream',
  data jsonb not null default '[]'::jsonb,   -- elemen: teks, stiker, foto, posisi
  is_draft boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  from_user uuid not null default auth.uid() references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  title text, body text, template text default 'pink', envelope text default 'rose',
  stickers text, photo_path text,
  category text default 'free',            -- free | sad | tired | miss | motivation | happy | lonely | hug | sleepless | anniversary | birthday | achievement | meet
  unlock_at timestamptz,                   -- surat terjadwal
  is_draft boolean not null default false,
  favorite boolean not null default false,
  opened_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.question_answers (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_by uuid default auth.uid(),
  day date not null, question text not null, answer text not null,
  created_at timestamptz not null default now(),
  unique (couple_id, user_id, day)
);

create table if not exists public.mood_checkins (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_by uuid default auth.uid(),
  day date not null, mood text not null, note text, reply text,
  created_at timestamptz not null default now(),
  unique (couple_id, user_id, day)
);

create table if not exists public.affections (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  from_user uuid not null default auth.uid() references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  created_by uuid default auth.uid(),
  kind text not null, seen boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.bucket_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  title text not null, description text, target_date date,
  done boolean not null default false, done_at date, proof_path text, note text,
  created_at timestamptz not null default now()
);

create table if not exists public.time_capsules (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  title text not null, open_at timestamptz not null,
  content jsonb not null default '{}'::jsonb,   -- {letter, predictions, wishes, promises, photos[]}
  created_at timestamptz not null default now()
);

create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  title text not null, event_date date not null, description text,
  location text, photo_path text, created_at timestamptz not null default now()
);

create table if not exists public.playlist_songs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  playlist text not null default 'Favorit Kita',
  title text not null, artist text, url text, note text, memory text,
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_by uuid default auth.uid(),
  game text not null, round text not null default 'default',
  data jsonb not null default '{}'::jsonb, score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, user_id, game, round)
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null unique references public.couples(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  name text not null, kind text not null default 'cat',
  hunger numeric not null default 80, happiness numeric not null default 80,
  affection numeric not null default 80,
  accessory text, unlocked text[] not null default '{}',
  care_count int not null default 0, log jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.special_dates (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  title text not null, date date not null,
  kind text not null default 'custom',   -- anniversary | birthday | first_meet | first_date | event | custom
  yearly boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  title text not null, body text, pinned boolean not null default false,
  checklist jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  name text not null, lat double precision, lng double precision,
  visited_on date, description text, category text default 'favorite', photo_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.location_shares (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_by uuid default auth.uid(),
  enabled boolean not null default false,
  share_until timestamptz,
  lat double precision, lng double precision, accuracy double precision,
  updated_at timestamptz not null default now(),
  unique (couple_id, user_id)
);

create table if not exists public.battery_status (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_by uuid default auth.uid(),
  level int check (level between 0 and 100), charging boolean,
  source text default 'auto',            -- auto | manual
  updated_at timestamptz not null default now(),
  unique (couple_id, user_id)
);

create table if not exists public.countdowns (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  title text not null, target_at timestamptz not null, message text, cover_path text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  from_user uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_by uuid default auth.uid(),
  body text not null, created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  created_by uuid default auth.uid(),
  kind text not null, title text not null, body text, link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_media_folder on public.media(folder_id);
create index if not exists idx_letters_to on public.letters(to_user, created_at desc);
create index if not exists idx_msgs on public.messages(couple_id, created_at);
create index if not exists idx_notif on public.notifications(to_user, created_at desc);

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;

-- profil: diri sendiri + anggota pasangan yang sama
create policy "profiles_select" on public.profiles for select using (
  id = auth.uid() or exists (
    select 1 from couple_members a join couple_members b on a.couple_id = b.couple_id
    where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy "profiles_insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update using (id = auth.uid());

create policy "couples_select" on public.couples for select using (public.is_member(id));
create policy "couples_update" on public.couples for update using (public.is_member(id));
-- insert/delete hanya lewat RPC security definer

create policy "members_select" on public.couple_members for select using (public.is_member(couple_id));

-- Tabel "umum": semua anggota pasangan boleh CRUD
do $$
declare t text;
begin
  foreach t in array array[
    'memory_folders','media','scrapbooks','scrapbook_pages','bucket_items',
    'timeline_events','playlist_songs','pets','special_dates','notes','places',
    'countdowns','messages'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s_all" on public.%1$I for all using (public.is_member(couple_id)) with check (public.is_member(couple_id))', t);
  end loop;
end $$;

-- Tabel milik individu: baca oleh pasangan, tulis hanya oleh pemilik
do $$
declare t text;
begin
  foreach t in array array['mood_checkins','game_sessions','battery_status'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s_sel" on public.%1$I for select using (public.is_member(couple_id))', t);
    execute format('create policy "%1$s_ins" on public.%1$I for insert with check (public.is_member(couple_id) and user_id = auth.uid())', t);
    execute format('create policy "%1$s_upd" on public.%1$I for update using (user_id = auth.uid())', t);
    execute format('create policy "%1$s_del" on public.%1$I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

-- Mood: pasangan boleh membalas (kolom reply) => update oleh anggota
drop policy if exists "mood_checkins_upd" on public.mood_checkins;
create policy "mood_checkins_upd" on public.mood_checkins for update using (public.is_member(couple_id));

-- Jawaban pertanyaan harian: jawaban pasangan baru terlihat setelah kamu menjawab hari yang sama
alter table public.question_answers enable row level security;
create policy "qa_sel" on public.question_answers for select using (
  user_id = auth.uid() or (
    public.is_member(couple_id) and exists (
      select 1 from question_answers me
      where me.user_id = auth.uid() and me.couple_id = question_answers.couple_id and me.day = question_answers.day)));
create policy "qa_ins" on public.question_answers for insert with check (public.is_member(couple_id) and user_id = auth.uid());
create policy "qa_upd" on public.question_answers for update using (user_id = auth.uid());
create policy "qa_del" on public.question_answers for delete using (user_id = auth.uid());

-- Surat: hanya pengirim & penerima; penerima tidak bisa membaca sebelum unlock_at / selama draft
alter table public.letters enable row level security;
create policy "letters_sel" on public.letters for select using (
  public.is_member(couple_id) and (
    from_user = auth.uid() or
    (to_user = auth.uid() and not is_draft and (unlock_at is null or unlock_at <= now()))));
create policy "letters_ins" on public.letters for insert with check (public.is_member(couple_id) and from_user = auth.uid());
create policy "letters_upd" on public.letters for update using (
  public.is_member(couple_id) and (from_user = auth.uid() or to_user = auth.uid()));
create policy "letters_del" on public.letters for delete using (from_user = auth.uid());

-- Afeksi virtual
alter table public.affections enable row level security;
create policy "aff_sel" on public.affections for select using (public.is_member(couple_id) and (from_user = auth.uid() or to_user = auth.uid()));
create policy "aff_ins" on public.affections for insert with check (public.is_member(couple_id) and from_user = auth.uid());
create policy "aff_upd" on public.affections for update using (to_user = auth.uid());

-- Kapsul waktu: isi hanya terbaca setelah open_at (pembuat boleh melihat miliknya).
-- Pasangan melihat judul + hitung mundur lewat view capsule_index.
alter table public.time_capsules enable row level security;
create policy "tc_sel" on public.time_capsules for select using (
  public.is_member(couple_id) and (open_at <= now() or created_by = auth.uid()));
create policy "tc_ins" on public.time_capsules for insert with check (public.is_member(couple_id));
create policy "tc_upd" on public.time_capsules for update using (created_by = auth.uid() and open_at > now());
create policy "tc_del" on public.time_capsules for delete using (created_by = auth.uid());

create or replace view public.capsule_index as
  select id, couple_id, created_by, title, open_at, created_at
  from public.time_capsules
  where public.is_member(couple_id);

-- Lokasi: milik sendiri selalu terbaca; milik pasangan hanya saat sharing aktif & belum kedaluwarsa
alter table public.location_shares enable row level security;
create policy "loc_sel" on public.location_shares for select using (
  user_id = auth.uid() or (
    public.is_member(couple_id) and enabled and (share_until is null or share_until > now())));
create policy "loc_ins" on public.location_shares for insert with check (public.is_member(couple_id) and user_id = auth.uid());
create policy "loc_upd" on public.location_shares for update using (user_id = auth.uid());
create policy "loc_del" on public.location_shares for delete using (user_id = auth.uid());

-- Notifikasi: penerima membaca; anggota pasangan boleh membuat untuk pasangannya
alter table public.notifications enable row level security;
create policy "n_sel" on public.notifications for select using (to_user = auth.uid());
create policy "n_ins" on public.notifications for insert with check (public.is_member(couple_id));
create policy "n_upd" on public.notifications for update using (to_user = auth.uid());
create policy "n_del" on public.notifications for delete using (to_user = auth.uid());

-- ============================================================
-- Storage: bucket privat "media"; path = <couple_id>/<file>
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media','media', false, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
on conflict (id) do nothing;

create policy "media_read" on storage.objects for select
  using (bucket_id = 'media' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "media_write" on storage.objects for insert
  with check (bucket_id = 'media' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "media_update" on storage.objects for update
  using (bucket_id = 'media' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "media_delete" on storage.objects for delete
  using (bucket_id = 'media' and public.is_member(((storage.foldername(name))[1])::uuid));

-- ============================================================
-- Realtime
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'memory_folders','media','scrapbook_pages','letters','question_answers','mood_checkins',
    'affections','bucket_items','timeline_events','playlist_songs','pets','special_dates','notes',
    'places','location_shares','battery_status','countdowns','messages','notifications','game_sessions'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ============================================================
-- Auto-buat profil saat akun baru dibuat
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
