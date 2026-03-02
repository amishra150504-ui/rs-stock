-- Run this in Supabase SQL Editor
-- 1) Shared app state in one row (global)
create table if not exists public.app_state (
  id text primary key,
  items jsonb not null default '[]'::jsonb,
  entries jsonb not null default '[]'::jsonb,
  daily_entries jsonb not null default '[]'::jsonb,
  categories jsonb not null default '[]'::jsonb,
  entry_counter bigint not null default 1,
  updated_at timestamptz not null default now()
);

-- 2) Shared users table
create table if not exists public.users (
  id text primary key,
  password text not null,
  role text not null check (role in ('admin', 'staff')),
  name text not null,
  gender text default '',
  phone text default '',
  email text default '',
  address text default '',
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh on update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_state_updated_at on public.app_state;
create trigger trg_app_state_updated_at
before update on public.app_state
for each row
execute function public.set_updated_at();

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

-- Enable realtime replication for both tables
alter table public.app_state replica identity full;
alter table public.users replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_state'
  ) then
    alter publication supabase_realtime add table public.app_state;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'users'
  ) then
    alter publication supabase_realtime add table public.users;
  end if;
end $$;

-- Demo/open policies for anon key access from this frontend.
-- For production, lock these down and use Supabase Auth.
alter table public.app_state enable row level security;
alter table public.users enable row level security;

drop policy if exists "app_state_select_all" on public.app_state;
create policy "app_state_select_all"
on public.app_state
for select
to anon
using (true);

drop policy if exists "app_state_write_all" on public.app_state;
create policy "app_state_write_all"
on public.app_state
for all
to anon
using (true)
with check (true);

drop policy if exists "users_select_all" on public.users;
create policy "users_select_all"
on public.users
for select
to anon
using (true);

drop policy if exists "users_write_all" on public.users;
create policy "users_write_all"
on public.users
for all
to anon
using (true)
with check (true);

-- Seed default app state row if absent
insert into public.app_state (id, items, entries, daily_entries, categories, entry_counter)
values (
  'global',
  '[
    {"name":"5.5mm Rod","category":"Rod","conversion":2.24,"minStock":100},
    {"name":"6mm Rod","category":"Rod","conversion":2.67,"minStock":100},
    {"name":"8mm Rod","category":"Rod","conversion":4.74,"minStock":100},
    {"name":"10mm Rod","category":"Rod","conversion":7.4,"minStock":100},
    {"name":"12mm Rod","category":"Rod","conversion":10.65,"minStock":100},
    {"name":"16mm Rod","category":"Rod","conversion":18.96,"minStock":100},
    {"name":"20mm Rod","category":"Rod","conversion":29.6,"minStock":100}
  ]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '["Rod","Cement"]'::jsonb,
  1
)
on conflict (id) do nothing;

-- Seed default users if absent
insert into public.users (id, password, role, name)
values
  ('admin', 'admin123', 'admin', 'Administrator'),
  ('staff1', 'staff123', 'staff', 'Staff One')
on conflict (id) do nothing;
