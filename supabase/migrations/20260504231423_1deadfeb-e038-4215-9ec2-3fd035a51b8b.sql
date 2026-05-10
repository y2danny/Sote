
-- Roles enum & user_roles table (separate from profiles to avoid privilege escalation)
create type public.app_role as enum ('importer', 'operator', 'vendor');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  business_name text,
  wallet_address text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Auto-create profile + importer role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, business_name, wallet_address)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'business_name', split_part(new.email, '@', 1)),
    'So' || substr(replace(new.id::text, '-', ''), 1, 40)
  );
  insert into public.user_roles (user_id, role) values (new.id, 'importer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- VENDORS
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  importer_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  corridor text not null check (corridor in ('usd_offramp','sgd_offramp','direct_pusd')),
  destination jsonb not null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index on public.vendors(importer_id);

-- INVOICES
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  importer_id uuid not null references auth.users(id) on delete cascade,
  vendor_id uuid references public.vendors(id),
  vendor_snapshot jsonb not null,
  corridor text not null check (corridor in ('usd_offramp','sgd_offramp','direct_pusd')),
  amount_pusd bigint not null,
  sote_fee_pusd bigint not null,
  offramp_fee_pusd bigint not null,
  total_pusd bigint not null,
  reference text,
  description text,
  status text not null default 'awaiting_payment' check (status in (
    'draft','awaiting_payment','on_chain_pending','on_chain_confirmed',
    'offramp_processing','offramp_failed','delivered','refunded','cancelled'
  )),
  invoice_pda text,
  pay_tx_signature text,
  release_tx_signature text,
  refund_tx_signature text,
  on_chain_slot bigint,
  offramp_provider text default 'stub',
  offramp_reference text,
  offramp_error text,
  force_failure boolean not null default false,
  next_advance_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  delivered_at timestamptz
);
create index on public.invoices(importer_id, created_at desc);
create index on public.invoices(status);
create index on public.invoices(next_advance_at) where next_advance_at is not null;

-- QUOTES
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  importer_id uuid not null references auth.users(id) on delete cascade,
  corridor text not null,
  amount_usd numeric(20,2) not null,
  fee_breakdown jsonb not null,
  total_pusd bigint not null,
  expires_at timestamptz not null default (now() + interval '3 minutes'),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

-- OFF-RAMP EVENTS
create table public.offramp_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index on public.offramp_events(invoice_id, created_at desc);

-- AUDIT LOG
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references auth.users(id),
  action text not null,
  invoice_id uuid references public.invoices(id),
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.vendors enable row level security;
alter table public.invoices enable row level security;
alter table public.quotes enable row level security;
alter table public.offramp_events enable row level security;
alter table public.audit_log enable row level security;

-- profiles
create policy "own profile select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'operator'));
create policy "own profile update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- user_roles (read-only to user, full to operators)
create policy "see own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'operator'));

-- vendors
create policy "vendors importer crud" on public.vendors for all to authenticated
  using (importer_id = auth.uid()) with check (importer_id = auth.uid());
create policy "vendors operator read" on public.vendors for select to authenticated
  using (public.has_role(auth.uid(),'operator'));

-- invoices
create policy "invoices importer read" on public.invoices for select to authenticated
  using (importer_id = auth.uid());
create policy "invoices importer insert" on public.invoices for insert to authenticated
  with check (importer_id = auth.uid());
create policy "invoices operator read" on public.invoices for select to authenticated
  using (public.has_role(auth.uid(),'operator'));
create policy "invoices operator update" on public.invoices for update to authenticated
  using (public.has_role(auth.uid(),'operator'));
-- Public receipt access (delivered/refunded only) for vendor receipt page
create policy "invoices public delivered" on public.invoices for select to anon, authenticated
  using (status in ('delivered','refunded'));

-- quotes
create policy "quotes importer all" on public.quotes for all to authenticated
  using (importer_id = auth.uid()) with check (importer_id = auth.uid());

-- offramp_events
create policy "offramp_events read importer" on public.offramp_events for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and i.importer_id = auth.uid()));
create policy "offramp_events read operator" on public.offramp_events for select to authenticated
  using (public.has_role(auth.uid(),'operator'));
create policy "offramp_events insert system" on public.offramp_events for insert to authenticated
  with check (true);

-- audit_log
create policy "audit operator all" on public.audit_log for all to authenticated
  using (public.has_role(auth.uid(),'operator')) with check (public.has_role(auth.uid(),'operator'));

-- Realtime
alter publication supabase_realtime add table public.invoices;
alter publication supabase_realtime add table public.offramp_events;
