-- ================================================================
-- B1Overs Wallet — Complete Database Schema
-- Run this ONCE in the Supabase SQL Editor on a fresh database.
-- Covers all currently-built features AND all Phase 1–5 roadmap
-- features so the schema is ready as each phase ships.
-- ================================================================
-- TABLE OF CONTENTS
-- ─────────────────────────────────────────────────────────────
-- ALREADY BUILT
--   1.  transactions
--   2.  user_settings
--   3.  invoices
--   4.  recurring_rules
--   5.  waitlist
--   6.  budget_alert_log
--   7.  credit_score_history
--
-- PHASE 1 — User System Connection
--   8.  beoneofus_connections
--   9.  api_tokens
--   10. wallet_profiles
--
-- PHASE 2 — Budget Wallet Features (tables shared with built features above)
--   (transactions, user_settings, budget_alert_log, credit_score_history)
--   11. bill_reminders
--
-- PHASE 3 — Payment Integration
--   12. shared_wallets          (+ wallet_members, wallet_invites)
--   13. wallet_members
--   14. wallet_invites
--   15. wallet_transfers
--   16. mobile_money_accounts
--   17. mobile_money_transactions
--   18. bank_connections
--   19. bank_transactions
--   20. qr_payments
--
-- PHASE 4 — Security
--   21. transaction_pins
--   22. fraud_alerts
--   23. audit_logs
--
-- PHASE 5 — Future Features
--   24. subscriptions
--   25. virtual_cards
--   26. ai_suggestions
--   27. crypto_wallets
--   28. crypto_transactions
--   29. investment_portfolios
--   30. investment_holdings
--   31. investment_transactions
-- ================================================================


-- ================================================================
-- ALREADY-BUILT FEATURES
-- ================================================================

-- ── 1. transactions ─────────────────────────────────────────────
-- Core of the app. Every income/expense entry, payment, and
-- auto-posted recurring transaction lands here.

CREATE TABLE IF NOT EXISTS public.transactions (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  type        TEXT          NOT NULL CHECK (type IN ('income', 'expense')),
  category    TEXT          NOT NULL,
  description TEXT,
  wallet_id   UUID,                          -- FK added after shared_wallets is created (below)
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id    ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type       ON public.transactions(type);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);


-- ── 2. user_settings ────────────────────────────────────────────
-- One row per user. Stores savings goal, per-category budget
-- limits, recurring rules (JSONB until Phase 2 normalization),
-- and display currency preference.

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id            UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  savings_goal       NUMERIC(12,2) NOT NULL DEFAULT 0,
  category_budgets   JSONB         NOT NULL DEFAULT '{}',
  recurring_rules    JSONB         NOT NULL DEFAULT '[]',
  preferred_currency TEXT          NOT NULL DEFAULT 'MUR',
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);


-- ── 3. invoices ─────────────────────────────────────────────────
-- Pay & Invoice page is already built. Currently only saves a
-- transaction; this table persists the invoice record (recipient,
-- PDF path, currency) that is otherwise lost after the session.

CREATE TABLE IF NOT EXISTS public.invoices (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID          REFERENCES public.transactions(id) ON DELETE SET NULL,
  recipient      TEXT          NOT NULL,
  amount         NUMERIC(12,2) NOT NULL,
  currency       TEXT          NOT NULL DEFAULT 'MUR',
  description    TEXT,
  pdf_url        TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own invoices" ON public.invoices;
CREATE POLICY "Users can manage own invoices"
  ON public.invoices FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 4. recurring_rules ──────────────────────────────────────────
-- RecurringPage is already built. Rules are currently stored as
-- JSONB in user_settings.recurring_rules; this normalized table
-- supports future server-side auto-posting.

CREATE TABLE IF NOT EXISTS public.recurring_rules (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT          NOT NULL,
  amount     NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  type       TEXT          NOT NULL CHECK (type IN ('income', 'expense')),
  category   TEXT          NOT NULL,
  period     TEXT          NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
  next_date  DATE          NOT NULL,
  active     BOOLEAN       NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_rules_user_id   ON public.recurring_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_next_date ON public.recurring_rules(next_date);

ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own recurring rules" ON public.recurring_rules;
CREATE POLICY "Users manage own recurring rules"
  ON public.recurring_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 5. waitlist ─────────────────────────────────────────────────
-- SharedPage already has a "Join Waitlist" form that currently
-- only calls alert(). This table persists the email.

CREATE TABLE IF NOT EXISTS public.waitlist (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  feature    TEXT        NOT NULL DEFAULT 'shared_wallets',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (true);


-- ── 6. budget_alert_log ─────────────────────────────────────────
-- BudgetLimits component already fires 80% and 100% alerts as
-- toasts. This table makes them persistent for audit and history.

CREATE TABLE IF NOT EXISTS public.budget_alert_log (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category        TEXT          NOT NULL,
  budget_limit    NUMERIC(12,2) NOT NULL,
  amount_spent    NUMERIC(12,2) NOT NULL,
  alert_type      TEXT          NOT NULL CHECK (alert_type IN ('warning_80', 'over_budget')),
  fired_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_budget_alert_log_user_id ON public.budget_alert_log(user_id);

ALTER TABLE public.budget_alert_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own budget alerts" ON public.budget_alert_log;
CREATE POLICY "Users manage own budget alerts"
  ON public.budget_alert_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 7. credit_score_history ─────────────────────────────────────
-- app/page.js already calculates a credit score on every render.
-- This table snapshots it periodically so a trend chart can be
-- built (Analytics page already has the chart slots).

CREATE TABLE IF NOT EXISTS public.credit_score_history (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score       INT           NOT NULL CHECK (score BETWEEN 300 AND 850),
  rating      TEXT          NOT NULL CHECK (rating IN ('Excellent', 'Good', 'Fair', 'Poor', 'Bad')),
  balance     NUMERIC(12,2) NOT NULL,
  income      NUMERIC(12,2) NOT NULL,
  expenses    NUMERIC(12,2) NOT NULL,
  snapshot_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_score_user_id     ON public.credit_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_score_snapshot_at ON public.credit_score_history(snapshot_at DESC);

ALTER TABLE public.credit_score_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own credit score history" ON public.credit_score_history;
CREATE POLICY "Users view own credit score history"
  ON public.credit_score_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ================================================================
-- PHASE 1 — USER SYSTEM CONNECTION
-- ================================================================

-- ── 8. beoneofus_connections ────────────────────────────────────
-- OAuth / JWT link to the user's BeOneOfUs account.
-- Tokens must be hashed/encrypted before insert — never plaintext.

CREATE TABLE IF NOT EXISTS public.beoneofus_connections (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  beoneofus_user_id  TEXT        NOT NULL,
  beoneofus_username TEXT        NOT NULL,
  access_token_hash  TEXT        NOT NULL,
  refresh_token_hash TEXT,
  token_type         TEXT        NOT NULL DEFAULT 'oauth2' CHECK (token_type IN ('jwt', 'oauth2')),
  token_expires_at   TIMESTAMPTZ,
  scopes             TEXT[]      NOT NULL DEFAULT '{}',
  last_synced_at     TIMESTAMPTZ,
  is_active          BOOLEAN     NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.beoneofus_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own BeOneOfUs connection" ON public.beoneofus_connections;
CREATE POLICY "Users manage own BeOneOfUs connection"
  ON public.beoneofus_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 9. api_tokens ───────────────────────────────────────────────
-- Server-side tokens used to call the BeOneOfUs API on behalf
-- of a user. Store only the SHA-256 hash, never the raw token.

CREATE TABLE IF NOT EXISTS public.api_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  token_hash   TEXT        NOT NULL UNIQUE,
  scopes       TEXT[]      NOT NULL DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id    ON public.api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_token_hash ON public.api_tokens(token_hash);

ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own API tokens" ON public.api_tokens;
CREATE POLICY "Users manage own API tokens"
  ON public.api_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 10. wallet_profiles ─────────────────────────────────────────
-- Synced snapshot of BeOneOfUs profile shown in the wallet UI.
-- Refreshed on each login sync.

CREATE TABLE IF NOT EXISTS public.wallet_profiles (
  user_id            UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name       TEXT,
  avatar_url         TEXT,
  beoneofus_username TEXT,
  synced_balance     NUMERIC(14,2),
  sync_authorized    BOOLEAN       NOT NULL DEFAULT false,
  last_synced_at     TIMESTAMPTZ,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own wallet profile" ON public.wallet_profiles;
CREATE POLICY "Users manage own wallet profile"
  ON public.wallet_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ================================================================
-- PHASE 2 — BUDGET WALLET FEATURES
-- (transactions, user_settings, budget_alert_log, and
--  credit_score_history above already cover income/expense
--  tracking, analytics, budgets, and savings goal)
-- ================================================================

-- ── 11. bill_reminders ──────────────────────────────────────────
-- Bills category exists in transactions but has no due-date or
-- paid/unpaid state. This table adds that tracking.

CREATE TABLE IF NOT EXISTS public.bill_reminders (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT          NOT NULL,
  amount     NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  due_date   DATE          NOT NULL,
  recurrence TEXT          NOT NULL DEFAULT 'once'
               CHECK (recurrence IN ('once', 'weekly', 'monthly', 'yearly')),
  category   TEXT          NOT NULL DEFAULT 'Bills & Utilities',
  is_paid    BOOLEAN       NOT NULL DEFAULT false,
  paid_at    TIMESTAMPTZ,
  notes      TEXT,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bill_reminders_user_id  ON public.bill_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_due_date ON public.bill_reminders(due_date);

ALTER TABLE public.bill_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own bill reminders" ON public.bill_reminders;
CREATE POLICY "Users manage own bill reminders"
  ON public.bill_reminders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ================================================================
-- PHASE 3 — PAYMENT INTEGRATION
-- ================================================================

-- ── 12. shared_wallets ──────────────────────────────────────────
-- SharedPage is built (Coming Soon UI). Tables created now so
-- wallet_id FK on transactions doesn't require a breaking change.

CREATE TABLE IF NOT EXISTS public.shared_wallets (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their shared wallet" ON public.shared_wallets;
CREATE POLICY "Owners manage their shared wallet"
  ON public.shared_wallets FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Now that shared_wallets exists, add the FK to transactions
DO $$ BEGIN
  ALTER TABLE public.transactions
    ADD CONSTRAINT fk_transactions_wallet
    FOREIGN KEY (wallet_id) REFERENCES public.shared_wallets(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);


-- ── 13. wallet_members ──────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE wallet_role AS ENUM ('owner', 'editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.wallet_members (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID        NOT NULL REFERENCES public.shared_wallets(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      wallet_role NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wallet_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_members_wallet_id ON public.wallet_members(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_members_user_id   ON public.wallet_members(user_id);

ALTER TABLE public.wallet_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their own memberships" ON public.wallet_members;
CREATE POLICY "Members can view their own memberships"
  ON public.wallet_members FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can manage members" ON public.wallet_members;
CREATE POLICY "Owners can manage members"
  ON public.wallet_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_wallets
      WHERE id = wallet_id AND owner_id = auth.uid()
    )
  );

-- Allow shared wallet members to see that wallet's transactions
DROP POLICY IF EXISTS "Shared wallet members can view wallet transactions" ON public.transactions;
CREATE POLICY "Shared wallet members can view wallet transactions"
  ON public.transactions FOR SELECT
  USING (
    wallet_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.wallet_members
      WHERE wallet_id = transactions.wallet_id AND user_id = auth.uid()
    )
  );


-- ── 14. wallet_invites ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wallet_invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id   UUID        NOT NULL REFERENCES public.shared_wallets(id) ON DELETE CASCADE,
  invited_by  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  role        wallet_role NOT NULL DEFAULT 'viewer',
  token       UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wallet_invites_token     ON public.wallet_invites(token);
CREATE INDEX IF NOT EXISTS idx_wallet_invites_wallet_id ON public.wallet_invites(wallet_id);

ALTER TABLE public.wallet_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage invites" ON public.wallet_invites;
CREATE POLICY "Owners can manage invites"
  ON public.wallet_invites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_wallets
      WHERE id = wallet_id AND owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can read an invite by token" ON public.wallet_invites;
CREATE POLICY "Anyone can read an invite by token"
  ON public.wallet_invites FOR SELECT
  USING (true);


-- ── 15. wallet_transfers ────────────────────────────────────────
-- Internal member-to-member transfers via BeOneOfUs username lookup.

CREATE TABLE IF NOT EXISTS public.wallet_transfers (
  id                           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id                    UUID          NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  recipient_beoneofus_username TEXT          NOT NULL,
  recipient_id                 UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  amount                       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency                     TEXT          NOT NULL DEFAULT 'MUR',
  description                  TEXT,
  reference                    TEXT          NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  status                       TEXT          NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  sender_transaction_id        UUID          REFERENCES public.transactions(id) ON DELETE SET NULL,
  recipient_transaction_id     UUID          REFERENCES public.transactions(id) ON DELETE SET NULL,
  confirmed_at                 TIMESTAMPTZ,
  created_at                   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transfers_sender_id    ON public.wallet_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transfers_recipient_id ON public.wallet_transfers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transfers_status       ON public.wallet_transfers(status);

ALTER TABLE public.wallet_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view transfers they sent or received" ON public.wallet_transfers;
CREATE POLICY "Users view transfers they sent or received"
  ON public.wallet_transfers FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can initiate transfers" ON public.wallet_transfers;
CREATE POLICY "Users can initiate transfers"
  ON public.wallet_transfers FOR INSERT
  WITH CHECK (auth.uid() = sender_id);


-- ── 16. mobile_money_accounts ───────────────────────────────────
-- Linked Juice / MyT Money / Emtel Cash / Orange Money accounts.

CREATE TABLE IF NOT EXISTS public.mobile_money_accounts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider     TEXT        NOT NULL
                 CHECK (provider IN ('juice', 'myt_money', 'emtel_cash', 'orange_money')),
  phone_number TEXT        NOT NULL,
  account_name TEXT,
  is_verified  BOOLEAN     NOT NULL DEFAULT false,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  linked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_mobile_money_accounts_user_id ON public.mobile_money_accounts(user_id);

ALTER TABLE public.mobile_money_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own mobile money accounts" ON public.mobile_money_accounts;
CREATE POLICY "Users manage own mobile money accounts"
  ON public.mobile_money_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 17. mobile_money_transactions ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.mobile_money_transactions (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id            UUID          NOT NULL REFERENCES public.mobile_money_accounts(id) ON DELETE RESTRICT,
  wallet_transaction_id UUID          REFERENCES public.transactions(id) ON DELETE SET NULL,
  provider              TEXT          NOT NULL,
  type                  TEXT          NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'merchant_payment')),
  amount                NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency              TEXT          NOT NULL DEFAULT 'MUR',
  merchant_name         TEXT,
  provider_reference    TEXT,
  status                TEXT          NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'completed', 'failed')),
  notification_sent     BOOLEAN       NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mobile_money_tx_user_id    ON public.mobile_money_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_money_tx_account_id ON public.mobile_money_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_mobile_money_tx_status     ON public.mobile_money_transactions(status);

ALTER TABLE public.mobile_money_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own mobile money transactions" ON public.mobile_money_transactions;
CREATE POLICY "Users view own mobile money transactions"
  ON public.mobile_money_transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 18. bank_connections ────────────────────────────────────────
-- Bank accounts linked via Plaid / Salt Edge / Yodlee.
-- access_token_encrypted must be AES-encrypted before insert.

CREATE TABLE IF NOT EXISTS public.bank_connections (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider               TEXT        NOT NULL CHECK (provider IN ('plaid', 'salt_edge', 'yodlee')),
  provider_connection_id TEXT        NOT NULL,
  institution_name       TEXT        NOT NULL,
  account_name           TEXT,
  account_type           TEXT        CHECK (account_type IN ('checking', 'savings', 'credit', 'other')),
  account_mask           TEXT,
  currency               TEXT        NOT NULL DEFAULT 'MUR',
  access_token_encrypted TEXT        NOT NULL,
  is_active              BOOLEAN     NOT NULL DEFAULT true,
  last_synced_at         TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, provider_connection_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_connections_user_id ON public.bank_connections(user_id);

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own bank connections" ON public.bank_connections;
CREATE POLICY "Users manage own bank connections"
  ON public.bank_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 19. bank_transactions ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id           UUID          NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  wallet_transaction_id   UUID          REFERENCES public.transactions(id) ON DELETE SET NULL,
  provider_transaction_id TEXT          NOT NULL,
  amount                  NUMERIC(12,2) NOT NULL,
  currency                TEXT          NOT NULL DEFAULT 'MUR',
  description             TEXT,
  category                TEXT,
  type                    TEXT          NOT NULL CHECK (type IN ('credit', 'debit')),
  date                    DATE          NOT NULL,
  synced_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (connection_id, provider_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_id       ON public.bank_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_connection_id ON public.bank_transactions(connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date          ON public.bank_transactions(date DESC);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own bank transactions" ON public.bank_transactions;
CREATE POLICY "Users view own bank transactions"
  ON public.bank_transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 20. qr_payments ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.qr_payments (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id  UUID          REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount          NUMERIC(12,2),
  currency        TEXT          NOT NULL DEFAULT 'MUR',
  description     TEXT,
  qr_data         TEXT          NOT NULL,
  status          TEXT          NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
  paid_by_user_id UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at      TIMESTAMPTZ   NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_payments_user_id ON public.qr_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_payments_status  ON public.qr_payments(status);

ALTER TABLE public.qr_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own QR payments" ON public.qr_payments;
CREATE POLICY "Users manage own QR payments"
  ON public.qr_payments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Payer can read QR payment to settle it" ON public.qr_payments;
CREATE POLICY "Payer can read QR payment to settle it"
  ON public.qr_payments FOR SELECT
  USING (auth.uid() = paid_by_user_id);


-- ================================================================
-- PHASE 4 — SECURITY
-- ================================================================

-- ── 21. transaction_pins ────────────────────────────────────────
-- Per-user PIN for confirming high-value transactions.
-- Store only the bcrypt hash — never the raw PIN.

CREATE TABLE IF NOT EXISTS public.transaction_pins (
  user_id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash        TEXT        NOT NULL,
  failed_attempts INT         NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transaction_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own transaction PIN" ON public.transaction_pins;
CREATE POLICY "Users manage own transaction PIN"
  ON public.transaction_pins FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 22. fraud_alerts ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fraud_alerts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID        REFERENCES public.transactions(id) ON DELETE SET NULL,
  alert_type     TEXT        NOT NULL
                   CHECK (alert_type IN ('unusual_amount', 'unusual_location',
                                         'velocity', 'duplicate', 'other')),
  severity       TEXT        NOT NULL DEFAULT 'medium'
                   CHECK (severity IN ('low', 'medium', 'high')),
  description    TEXT        NOT NULL,
  resolved       BOOLEAN     NOT NULL DEFAULT false,
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user_id  ON public.fraud_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_resolved ON public.fraud_alerts(resolved);

ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own fraud alerts" ON public.fraud_alerts;
CREATE POLICY "Users view own fraud alerts"
  ON public.fraud_alerts FOR SELECT
  USING (auth.uid() = user_id);


-- ── 23. audit_logs ──────────────────────────────────────────────
-- Immutable security log — no UPDATE or DELETE policies.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action     TEXT        NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata   JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own audit log" ON public.audit_logs;
CREATE POLICY "Users can view own audit log"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert audit log entries" ON public.audit_logs;
CREATE POLICY "System can insert audit log entries"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);


-- ================================================================
-- PHASE 5 — FUTURE FEATURES
-- ================================================================

-- ── 24. subscriptions ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT          NOT NULL,
  provider          TEXT,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency          TEXT          NOT NULL DEFAULT 'MUR',
  billing_cycle     TEXT          NOT NULL DEFAULT 'monthly'
                      CHECK (billing_cycle IN ('weekly', 'monthly', 'yearly')),
  next_billing_date DATE          NOT NULL,
  category          TEXT          NOT NULL DEFAULT 'Subscriptions',
  is_active         BOOLEAN       NOT NULL DEFAULT true,
  trial_ends_at     DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id           ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON public.subscriptions(next_billing_date);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own subscriptions" ON public.subscriptions;
CREATE POLICY "Users manage own subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 25. virtual_cards ───────────────────────────────────────────
-- Full card numbers must NEVER be stored — processor token and
-- last-4 mask only.

CREATE TABLE IF NOT EXISTS public.virtual_cards (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_token      TEXT          NOT NULL UNIQUE,
  card_mask       TEXT          NOT NULL,
  cardholder_name TEXT          NOT NULL,
  expiry_month    INT           NOT NULL CHECK (expiry_month BETWEEN 1 AND 12),
  expiry_year     INT           NOT NULL,
  currency        TEXT          NOT NULL DEFAULT 'MUR',
  spending_limit  NUMERIC(12,2),
  is_frozen       BOOLEAN       NOT NULL DEFAULT false,
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_virtual_cards_user_id ON public.virtual_cards(user_id);

ALTER TABLE public.virtual_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own virtual cards" ON public.virtual_cards;
CREATE POLICY "Users manage own virtual cards"
  ON public.virtual_cards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 26. ai_suggestions ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL
               CHECK (type IN ('budget_tip', 'spending_alert', 'savings_suggestion',
                               'investment_idea', 'subscription_review')),
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  data       JSONB       NOT NULL DEFAULT '{}',
  dismissed  BOOLEAN     NOT NULL DEFAULT false,
  acted_on   BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_id ON public.ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type    ON public.ai_suggestions(type);

ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own AI suggestions" ON public.ai_suggestions;
CREATE POLICY "Users manage own AI suggestions"
  ON public.ai_suggestions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 27. crypto_wallets ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.crypto_wallets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  network       TEXT        NOT NULL,
  address       TEXT        NOT NULL,
  label         TEXT,
  is_watch_only BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, network, address)
);

CREATE INDEX IF NOT EXISTS idx_crypto_wallets_user_id ON public.crypto_wallets(user_id);

ALTER TABLE public.crypto_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own crypto wallets" ON public.crypto_wallets;
CREATE POLICY "Users manage own crypto wallets"
  ON public.crypto_wallets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 28. crypto_transactions ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.crypto_transactions (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id         UUID          NOT NULL REFERENCES public.crypto_wallets(id) ON DELETE CASCADE,
  tx_hash           TEXT          NOT NULL,
  type              TEXT          NOT NULL CHECK (type IN ('send', 'receive', 'swap')),
  amount            NUMERIC(24,8) NOT NULL,
  coin              TEXT          NOT NULL,
  usd_value_at_time NUMERIC(14,2),
  fee               NUMERIC(24,8),
  status            TEXT          NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'failed')),
  confirmed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (wallet_id, tx_hash)
);

CREATE INDEX IF NOT EXISTS idx_crypto_tx_user_id   ON public.crypto_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_tx_wallet_id ON public.crypto_transactions(wallet_id);

ALTER TABLE public.crypto_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own crypto transactions" ON public.crypto_transactions;
CREATE POLICY "Users view own crypto transactions"
  ON public.crypto_transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 29. investment_portfolios ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.investment_portfolios (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  broker     TEXT,
  currency   TEXT        NOT NULL DEFAULT 'MUR',
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investment_portfolios_user_id ON public.investment_portfolios(user_id);

ALTER TABLE public.investment_portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own portfolios" ON public.investment_portfolios;
CREATE POLICY "Users manage own portfolios"
  ON public.investment_portfolios FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 30. investment_holdings ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.investment_holdings (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id    UUID          NOT NULL REFERENCES public.investment_portfolios(id) ON DELETE CASCADE,
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol          TEXT          NOT NULL,
  name            TEXT          NOT NULL,
  asset_type      TEXT          NOT NULL
                    CHECK (asset_type IN ('stock', 'etf', 'crypto', 'bond', 'other')),
  quantity        NUMERIC(20,8) NOT NULL DEFAULT 0,
  average_cost    NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_price   NUMERIC(14,2),
  currency        TEXT          NOT NULL DEFAULT 'USD',
  last_updated_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (portfolio_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_investment_holdings_portfolio_id ON public.investment_holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_user_id      ON public.investment_holdings(user_id);

ALTER TABLE public.investment_holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own holdings" ON public.investment_holdings;
CREATE POLICY "Users manage own holdings"
  ON public.investment_holdings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 31. investment_transactions ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.investment_transactions (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_id UUID          NOT NULL REFERENCES public.investment_holdings(id) ON DELETE CASCADE,
  user_id    UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT          NOT NULL CHECK (type IN ('buy', 'sell', 'dividend', 'split')),
  quantity   NUMERIC(20,8) NOT NULL,
  price      NUMERIC(14,2) NOT NULL,
  fee        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total      NUMERIC(14,2) NOT NULL,
  date       DATE          NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investment_tx_holding_id ON public.investment_transactions(holding_id);
CREATE INDEX IF NOT EXISTS idx_investment_tx_user_id    ON public.investment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_tx_date       ON public.investment_transactions(date DESC);

ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own investment transactions" ON public.investment_transactions;
CREATE POLICY "Users manage own investment transactions"
  ON public.investment_transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
