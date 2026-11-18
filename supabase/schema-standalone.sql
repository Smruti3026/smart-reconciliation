-- =============================================================================
-- Smart Reconciliation Platform — Standalone PostgreSQL Schema
-- (No Supabase — works with plain PostgreSQL + pgAdmin)
-- =============================================================================
-- Run this in pgAdmin's Query Tool after creating a DB named smart_reconciliation:
--   Right-click DB → Query Tool → paste all of this → F5 / Run
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. USERS  (replaces Supabase auth.users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,           -- bcrypt hash — NEVER store plaintext
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. PROFILES  (extra info per user)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL DEFAULT '',
  company_name  TEXT NOT NULL DEFAULT '',
  phone         TEXT DEFAULT '',
  avatar_url    TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create a profile when a user is inserted (via trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_created ON public.users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 3. COMPANIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  gstin          TEXT DEFAULT '',
  pan            TEXT DEFAULT '',
  address        TEXT DEFAULT '',
  city           TEXT DEFAULT '',
  state          TEXT DEFAULT '',
  pincode        TEXT DEFAULT '',
  financial_year TEXT DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);

-- =============================================================================
-- 4. CUSTOMERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  gstin           TEXT DEFAULT '',
  email           TEXT DEFAULT '',
  phone           TEXT DEFAULT '',
  address         TEXT DEFAULT '',
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);

-- =============================================================================
-- 5. VENDORS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  gstin           TEXT DEFAULT '',
  email           TEXT DEFAULT '',
  phone           TEXT DEFAULT '',
  address         TEXT DEFAULT '',
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendors_company_id ON public.vendors(company_id);

-- =============================================================================
-- 6. RECONCILIATIONS
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE reconciliation_type AS ENUM ('customer', 'vendor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reconciliation_status AS ENUM ('draft', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.reconciliations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  party_id          UUID NOT NULL,
  type              reconciliation_type NOT NULL,
  status            reconciliation_status NOT NULL DEFAULT 'draft',
  period_from       DATE,
  period_to         DATE,
  total_entries     INTEGER NOT NULL DEFAULT 0,
  matched_entries   INTEGER NOT NULL DEFAULT 0,
  unmatched_entries INTEGER NOT NULL DEFAULT 0,
  our_balance       NUMERIC(15,2) NOT NULL DEFAULT 0,
  their_balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  difference        NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes             TEXT DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reconciliations_company ON public.reconciliations(company_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_party  ON public.reconciliations(party_id);

-- =============================================================================
-- 7. LEDGER ENTRIES
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE ledger_source AS ENUM ('our_books', 'their_books');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE entry_type AS ENUM ('debit', 'credit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES public.reconciliations(id) ON DELETE CASCADE,
  source            ledger_source NOT NULL,
  entry_date        DATE NOT NULL,
  voucher_number    TEXT DEFAULT '',
  description       TEXT NOT NULL DEFAULT '',
  entry_type        entry_type NOT NULL,
  amount            NUMERIC(15,2) NOT NULL,
  reference         TEXT DEFAULT '',
  is_matched        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_recon ON public.ledger_entries(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_date  ON public.ledger_entries(entry_date);

-- =============================================================================
-- 8. MATCH RESULTS
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE match_status AS ENUM ('matched', 'partial', 'unmatched');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.match_results (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES public.reconciliations(id) ON DELETE CASCADE,
  our_entry_id      UUID REFERENCES public.ledger_entries(id) ON DELETE SET NULL,
  their_entry_id    UUID REFERENCES public.ledger_entries(id) ON DELETE SET NULL,
  status            match_status NOT NULL DEFAULT 'unmatched',
  our_amount        NUMERIC(15,2) DEFAULT 0,
  their_amount      NUMERIC(15,2) DEFAULT 0,
  difference        NUMERIC(15,2) DEFAULT 0,
  matched_on        TEXT DEFAULT '',
  notes             TEXT DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_match_results_recon ON public.match_results(reconciliation_id);

-- =============================================================================
-- UPDATED_AT trigger — auto-update timestamp on row change
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
