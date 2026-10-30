create extension if not exists pgcrypto;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
create policy "Admins can read their own membership" on public.admin_users
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.is_juegue_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke all on function public.is_juegue_admin() from public, anon;
grant execute on function public.is_juegue_admin() to authenticated, service_role;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) between 1 and 100),
  description text not null check (length(trim(description)) between 1 and 1000),
  category text not null default 'Para conversar',
  duration_label text,
  price_clp integer not null check (price_clp > 0),
  photo_urls text[] not null default '{}',
  is_available boolean not null default true,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_catalog_idx on public.products (is_published, is_available, is_featured, created_at desc);
alter table public.products enable row level security;
create policy "Published products are visible in the catalog" on public.products
  for select to anon, authenticated using (is_published = true and deleted_at is null);
create policy "Admins manage products" on public.products
  for all to authenticated using (public.is_juegue_admin()) with check (public.is_juegue_admin());

create table public.home_promotions (
  id uuid primary key default gen_random_uuid(),
  eyebrow text,
  title text not null check (length(trim(title)) between 1 and 100),
  body text not null check (length(trim(body)) between 1 and 500),
  button_text text not null default 'Ver ideas',
  button_href text not null default '/#productos',
  image_url text,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index home_promotions_visible_idx on public.home_promotions (is_active, sort_order);
alter table public.home_promotions enable row level security;
create policy "Active promotions are public" on public.home_promotions
  for select to anon, authenticated using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );
create policy "Admins manage promotions" on public.home_promotions
  for all to authenticated using (public.is_juegue_admin()) with check (public.is_juegue_admin());

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_snapshot jsonb not null,
  customer_name text,
  customer_email text not null,
  total_amount integer not null check (total_amount > 0),
  deposit_amount integer not null check (deposit_amount > 0),
  platform_fee integer not null check (platform_fee >= 0),
  store_deposit integer not null check (store_deposit >= 0),
  balance_due integer not null check (balance_due >= 0),
  currency text not null default 'CLP',
  payment_provider text not null default 'mercadopago',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  provider_preference_id text,
  provider_payment_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (deposit_amount + balance_due = total_amount),
  check (platform_fee + store_deposit = deposit_amount)
);
create index reservations_paid_idx on public.reservations (status, paid_at desc);
alter table public.reservations enable row level security;
create policy "Admins can read reservations" on public.reservations
  for select to authenticated using (public.is_juegue_admin());

create table public.reservation_notifications (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed')),
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.reservation_notifications enable row level security;
create policy "Admins can read reservation notifications" on public.reservation_notifications
  for select to authenticated using (public.is_juegue_admin());

grant select on public.admin_users to authenticated;
grant select on public.products, public.home_promotions to anon, authenticated;
grant insert, update, delete on public.products, public.home_promotions to authenticated;
grant select on public.reservations, public.reservation_notifications to authenticated;
grant all on public.admin_users, public.products, public.home_promotions, public.reservations, public.reservation_notifications to service_role;

create or replace function public.claim_shop_notification(p_reservation_id uuid)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  claimed uuid;
begin
  update public.reservation_notifications
  set status = 'sending', attempt_count = attempt_count + 1,
      last_attempt_at = now(), updated_at = now(), last_error = null
  where reservation_id = p_reservation_id and status in ('queued', 'failed')
  returning id into claimed;
  return claimed is not null;
end;
$$;
revoke all on function public.claim_shop_notification(uuid) from public, anon, authenticated;
grant execute on function public.claim_shop_notification(uuid) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Catalog photos are public" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');
create policy "Admins upload catalog photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_juegue_admin());
create policy "Admins update catalog photos" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_juegue_admin())
  with check (bucket_id = 'product-images' and public.is_juegue_admin());
create policy "Admins delete catalog photos" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_juegue_admin());
