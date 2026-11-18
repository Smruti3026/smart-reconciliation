-- =============================================================================
-- Smart Reconciliation Platform — Database Schema (Phase 1)
-- =============================================================================
-- Run this in Supabase SQL Editor after creating your project.
--
-- Tables:
--   profiles        — User profile (extends auth.users)
--   companies       — Business/company linked to a user
--   customers       — Customer master list per company
--   vendors         — Vendor master list per company
--   reconciliations — A reconciliation session (customer or vendor)
--   ledger_entries  — Individual ledger line items
--   match_results   — Matched/unmatched pairs from reconciliation
-- =============================================================================

-- ─────────────────────────────────────────────
-- 1. PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null default '',
  phone         text default '',
  avatar_url    text default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

-- Drop if exists to make this script re-runnable
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─────────────────────────────────────────────
-- 2. COMPANIES
-- ─────────────────────────────────────────────
create table if not exists public.companies (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  gstin         text default '',        -- 15-char GST number (optional for Phase 1)
  pan           text default '',        -- 10-char PAN
  address       text default '',
  city          text default '',
  state         text default '',
  pincode       text default '',
  financial_year text default '',       -- e.g. "2025-26"
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_companies_user_id on public.companies(user_id);


-- ─────────────────────────────────────────────
-- 3. CUSTOMERS (per company)
-- ─────────────────────────────────────────────
create table if not exists public.customers (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  gstin         text default '',
  email         text default '',
  phone         text default '',
  address       text default '',
  opening_balance numeric(15, 2) not null default 0,  -- ₹ amount
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_customers_company_id on public.customers(company_id);


-- ─────────────────────────────────────────────
-- 4. VENDORS (per company)
-- ─────────────────────────────────────────────
create table if not exists public.vendors (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  gstin         text default '',
  email         text default '',
  phone         text default '',
  address       text default '',
  opening_balance numeric(15, 2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_vendors_company_id on public.vendors(company_id);


-- ─────────────────────────────────────────────
-- 5. RECONCILIATIONS (a reconciliation session)
-- ─────────────────────────────────────────────
create type reconciliation_type as enum ('customer', 'vendor');
create type reconciliation_status as enum ('draft', 'in_progress', 'completed');

create table if not exists public.reconciliations (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  party_id          uuid not null,           -- references customers.id or vendors.id
  type              reconciliation_type not null,
  status            reconciliation_status not null default 'draft',
  period_from       date,
  period_to         date,
  total_entries     integer not null default 0,
  matched_entries   integer not null default 0,
  unmatched_entries integer not null default 0,
  our_balance       numeric(15, 2) not null default 0,
  their_balance     numeric(15, 2) not null default 0,
  difference        numeric(15, 2) not null default 0,
  notes             text default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_reconciliations_company on public.reconciliations(company_id);
create index if not exists idx_reconciliations_party on public.reconciliations(party_id);


-- ─────────────────────────────────────────────
-- 6. LEDGER ENTRIES
-- ─────────────────────────────────────────────
create type ledger_source as enum ('our_books', 'their_books');
create type entry_type as enum ('debit', 'credit');

create table if not exists public.ledger_entries (
  id                uuid primary key default gen_random_uuid(),
  reconciliation_id uuid not null references public.reconciliations(id) on delete cascade,
  source            ledger_source not null,        -- whose books this entry is from
  entry_date        date not null,
  voucher_number    text default '',
  description       text not null default '',
  entry_type        entry_type not null,
  amount            numeric(15, 2) not null,
  reference         text default '',               -- invoice/bill number
  is_matched        boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists idx_ledger_entries_recon on public.ledger_entries(reconciliation_id);
create index if not exists idx_ledger_entries_date on public.ledger_entries(entry_date);


-- ─────────────────────────────────────────────
-- 7. MATCH RESULTS
-- ─────────────────────────────────────────────
create type match_status as enum ('matched', 'partial', 'unmatched');

create table if not exists public.match_results (
  id                uuid primary key default gen_random_uuid(),
  reconciliation_id uuid not null references public.reconciliations(id) on delete cascade,
  our_entry_id      uuid references public.ledger_entries(id) on delete set null,
  their_entry_id    uuid references public.ledger_entries(id) on delete set null,
  status            match_status not null default 'unmatched',
  our_amount        numeric(15, 2) default 0,
  their_amount      numeric(15, 2) default 0,
  difference        numeric(15, 2) default 0,
  matched_on        text default '',         -- what matched: amount, ref, date, etc.
  notes             text default '',
  created_at        timestamptz not null default now()
);

create index if not exists idx_match_results_recon on public.match_results(reconciliation_id);


-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Every table is locked down: users can only see/edit their own data.

-- Profiles: user can only read/update their own profile
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);


-- Companies: user can CRUD their own companies
alter table public.companies enable row level security;

create policy "Users can view own companies"
  on public.companies for select
  using (auth.uid() = user_id);

create policy "Users can insert own companies"
  on public.companies for insert
  with check (auth.uid() = user_id);

create policy "Users can update own companies"
  on public.companies for update
  using (auth.uid() = user_id);

create policy "Users can delete own companies"
  on public.companies for delete
  using (auth.uid() = user_id);


-- Customers: accessible if the parent company belongs to the user
alter table public.customers enable row level security;

create policy "Users can view own customers"
  on public.customers for select
  using (
    exists (
      select 1 from public.companies
      where companies.id = customers.company_id
        and companies.user_id = auth.uid()
    )
  );

create policy "Users can insert own customers"
  on public.customers for insert
  with check (
    exists (
      select 1 from public.companies
      where companies.id = customers.company_id
        and companies.user_id = auth.uid()
    )
  );

create policy "Users can update own customers"
  on public.customers for update
  using (
    exists (
      select 1 from public.companies
      where companies.id = customers.company_id
        and companies.user_id = auth.uid()
    )
  );

create policy "Users can delete own customers"
  on public.customers for delete
  using (
    exists (
      select 1 from public.companies
      where companies.id = customers.company_id
        and companies.user_id = auth.uid()
    )
  );


-- Vendors: same pattern as customers
alter table public.vendors enable row level security;

create policy "Users can view own vendors"
  on public.vendors for select
  using (
    exists (
      select 1 from public.companies
      where companies.id = vendors.company_id
        and companies.user_id = auth.uid()
    )
  );

create policy "Users can insert own vendors"
  on public.vendors for insert
  with check (
    exists (
      select 1 from public.companies
      where companies.id = vendors.company_id
        and companies.user_id = auth.uid()
    )
  );

create policy "Users can update own vendors"
  on public.vendors for update
  using (
    exists (
      select 1 from public.companies
      where companies.id = vendors.company_id
        and companies.user_id = auth.uid()
    )
  );

create policy "Users can delete own vendors"
  on public.vendors for delete
  using (
    exists (
      select 1 from public.companies
      where companies.id = vendors.company_id
        and companies.user_id = auth.uid()
    )
  );


-- Reconciliations: accessible via parent company
alter table public.reconciliations enable row level security;

create policy "Users can view own reconciliations"
  on public.reconciliations for select
  using (
    exists (
      select 1 from public.companies
      where companies.id = reconciliations.company_id
        and companies.user_id = auth.uid()
    )
  );

create policy "Users can insert own reconciliations"
  on public.reconciliations for insert
  with check (
    exists (
      select 1 from public.companies
      where companies.id = reconciliations.company_id
        and companies.user_id = auth.uid()
    )
  );

create policy "Users can update own reconciliations"
  on public.reconciliations for update
  using (
    exists (
      select 1 from public.companies
      where companies.id = reconciliations.company_id
        and companies.user_id = auth.uid()
    )
  );

create policy "Users can delete own reconciliations"
  on public.reconciliations for delete
  using (
    exists (
      select 1 from public.companies
      where companies.id = reconciliations.company_id
        and companies.user_id = auth.uid()
    )
  );


-- Ledger entries: accessible via reconciliation → company chain
alter table public.ledger_entries enable row level security;

create policy "Users can view own ledger entries"
  on public.ledger_entries for select
  using (
    exists (
      select 1 from public.reconciliations r
      join public.companies c on c.id = r.company_id
      where r.id = ledger_entries.reconciliation_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can insert own ledger entries"
  on public.ledger_entries for insert
  with check (
    exists (
      select 1 from public.reconciliations r
      join public.companies c on c.id = r.company_id
      where r.id = ledger_entries.reconciliation_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can update own ledger entries"
  on public.ledger_entries for update
  using (
    exists (
      select 1 from public.reconciliations r
      join public.companies c on c.id = r.company_id
      where r.id = ledger_entries.reconciliation_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can delete own ledger entries"
  on public.ledger_entries for delete
  using (
    exists (
      select 1 from public.reconciliations r
      join public.companies c on c.id = r.company_id
      where r.id = ledger_entries.reconciliation_id
        and c.user_id = auth.uid()
    )
  );


-- Match results: same chain as ledger entries
alter table public.match_results enable row level security;

create policy "Users can view own match results"
  on public.match_results for select
  using (
    exists (
      select 1 from public.reconciliations r
      join public.companies c on c.id = r.company_id
      where r.id = match_results.reconciliation_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can insert own match results"
  on public.match_results for insert
  with check (
    exists (
      select 1 from public.reconciliations r
      join public.companies c on c.id = r.company_id
      where r.id = match_results.reconciliation_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can update own match results"
  on public.match_results for update
  using (
    exists (
      select 1 from public.reconciliations r
      join public.companies c on c.id = r.company_id
      where r.id = match_results.reconciliation_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can delete own match results"
  on public.match_results for delete
  using (
    exists (
      select 1 from public.reconciliations r
      join public.companies c on c.id = r.company_id
      where r.id = match_results.reconciliation_id
        and c.user_id = auth.uid()
    )
  );


-- =============================================================================
-- UPDATED_AT TRIGGER (auto-update timestamp on row change)
-- =============================================================================
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply to all tables that have updated_at
create trigger set_updated_at before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger set_updated_at before update on public.companies
  for each row execute function public.update_updated_at_column();

create trigger set_updated_at before update on public.customers
  for each row execute function public.update_updated_at_column();

create trigger set_updated_at before update on public.vendors
  for each row execute function public.update_updated_at_column();

create trigger set_updated_at before update on public.reconciliations
  for each row execute function public.update_updated_at_column();
