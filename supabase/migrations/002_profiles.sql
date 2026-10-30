create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 1 and 80),
  headline text not null default '' check (length(headline) <= 140),
  description text not null default '' check (length(description) <= 1000),
  appointment_type text not null default '' check (length(appointment_type) <= 100),
  rate_label text not null default 'Tarifa a consultar' check (length(rate_label) <= 80),
  media_urls text[] not null default '{}' check (cardinality(media_urls) <= 6),
  adult_consent_confirmed boolean not null default false,
  is_available boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_public_idx on public.profiles (is_published, is_available, created_at desc);
alter table public.profiles enable row level security;

-- Deliberately public editor requested for /clientes30. Anyone can change profiles and media.
create policy "Public can read profiles" on public.profiles
  for select to anon, authenticated using (true);
create policy "Open clientes30 editor inserts profiles" on public.profiles
  for insert to anon, authenticated with check (true);
create policy "Open clientes30 editor updates profiles" on public.profiles
  for update to anon, authenticated using (true) with check (true);
create policy "Open clientes30 editor removes profiles" on public.profiles
  for delete to anon, authenticated using (true);
grant select, insert, update, delete on public.profiles to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('girl-media', 'girl-media', true, 20971520, array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read profile media" on storage.objects
  for select to anon, authenticated using (bucket_id = 'girl-media');
create policy "Open clientes30 editor uploads profile media" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'girl-media');
create policy "Open clientes30 editor updates profile media" on storage.objects
  for update to anon, authenticated using (bucket_id = 'girl-media') with check (bucket_id = 'girl-media');
create policy "Open clientes30 editor removes profile media" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'girl-media');
