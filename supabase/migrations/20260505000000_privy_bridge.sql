-- =========================================================================
-- 20260505000000_privy_bridge.sql
--
-- Migrates the auth model from Supabase email/password to Privy + JWT bridge.
--
-- Strategy:
--   * Add profiles.privy_id (text, unique) — the canonical Privy DID.
--   * Drop the foreign key from profiles.id to auth.users(id) so Privy
--     identities don't have to exist in auth.users.
--   * Replace handle_new_user() (which fired on auth.users INSERT) with
--     ensure_user_from_privy(...), an RPC the bridge route calls explicitly.
--   * RLS keeps using auth.uid(); the bridge mints a JWT whose `sub` is
--     profiles.id, so policies need no changes for the importer/operator
--     paths. Only the FK references to auth.users are cleaned up.
--
-- Safety:
--   * Idempotent — running twice is a no-op.
--   * Safe on a fresh database. For an existing database with users in
--     auth.users, see docs/PRIVY_INTEGRATION.md → "Migrating existing users".
-- =========================================================================

-- ------- 1. Drop the legacy auth-trigger pipeline -------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- ------- 2. profiles: add privy_id, drop FK to auth.users -------
alter table public.profiles
  add column if not exists privy_id text;

-- Unique index (allows null for backwards-compat rows during migration)
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'profiles_privy_id_key'
  ) then
    create unique index profiles_privy_id_key on public.profiles(privy_id) where privy_id is not null;
  end if;
end$$;

-- Drop the FK to auth.users — Privy identities aren't in auth.users
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'profiles'
      and constraint_name = 'profiles_id_fkey'
  ) then
    alter table public.profiles drop constraint profiles_id_fkey;
  end if;
end$$;

-- Same for user_roles
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'user_roles'
      and constraint_name = 'user_roles_user_id_fkey'
  ) then
    alter table public.user_roles drop constraint user_roles_user_id_fkey;
  end if;
end$$;

-- Same for vendors / invoices / quotes / audit_log (drop FK to auth.users,
-- keep importer_id / operator_id / user_id as plain uuid that points to profiles.id)
do $$
declare
  rec record;
begin
  for rec in
    select tc.table_name, tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_schema = 'auth'
      and ccu.table_name  = 'users'
  loop
    execute format('alter table public.%I drop constraint %I', rec.table_name, rec.constraint_name);
  end loop;
end$$;

-- ------- 3. ensure_user_from_privy: idempotent upsert -------
-- Called from /api/privy-bridge with service role (bypasses RLS).
-- Returns the canonical profile row for the Privy user.
create or replace function public.ensure_user_from_privy(
  _privy_id text,
  _email text,
  _business_name text,
  _wallet_address text
) returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.profiles;
begin
  -- Try to find existing profile by privy_id
  select * into prof from public.profiles where privy_id = _privy_id;

  if found then
    -- Update fields that may have changed (email change, wallet linked, etc.)
    update public.profiles set
      email = coalesce(_email, email),
      business_name = coalesce(business_name, _business_name),
      wallet_address = coalesce(_wallet_address, wallet_address)
    where privy_id = _privy_id
    returning * into prof;
    return prof;
  end if;

  -- New user — create profile + grant importer role
  insert into public.profiles (id, privy_id, email, business_name, wallet_address)
  values (
    gen_random_uuid(),
    _privy_id,
    _email,
    coalesce(_business_name, split_part(coalesce(_email,''), '@', 1), 'New importer'),
    _wallet_address
  )
  returning * into prof;

  insert into public.user_roles (user_id, role) values (prof.id, 'importer');

  return prof;
end$$;

-- Restrict who can call this. Only the service role (bridge route) should hit it.
revoke execute on function public.ensure_user_from_privy(text, text, text, text)
  from public, anon, authenticated;

-- ------- 4. Optional: keep email auth users out of /profiles in dev -------
-- If anyone signs up via the legacy email path, they won't get a profiles row
-- because the trigger is gone. That's intentional — the only way in is Privy.

comment on function public.ensure_user_from_privy(text, text, text, text) is
  'Called server-side from /api/privy-bridge after verifying a Privy access token. Upserts a profile keyed by privy_id and ensures importer role. Service-role only.';

comment on column public.profiles.privy_id is
  'Privy user DID (e.g. did:privy:abc123). Source of truth for identity post-2026-05.';
