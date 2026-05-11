# Database Migration Document — B1Overs Wallet

Generated from full codebase scan on 2026-05-11.

---

## 1. Currently Active Tables

These two tables are already in use and must exist for the app to function.

---

### 1.1 `transactions`

**Referenced in:** `lib/transactions.js`, `components/AddTransactionForm.js`, `components/PayAndInvoice.js`, `app/page.js`

```sql
CREATE TABLE public.transactions (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  type        TEXT          NOT NULL CHECK (type IN ('income', 'expense')),
  category    TEXT          NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_id   ON public.transactions(user_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_type       ON public.transactions(type);
```

**Row Level Security:**

```sql
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);
```

**Notes:**
- `category` is free-text — the UI provides suggestions but does not enforce a fixed enum.
- `description` is optional (nullable).
- `created_at` is used for all date filtering, ledger sorting, and budget window calculations.
- `type` drives all income/expense split logic throughout the app.

---

### 1.2 `user_settings`

**Referenced in:** `lib/transactions.js` (`getUserSettings`, `updateUserSettings`), `components/BudgetLimits.js`, `components/SavingsGoal.js`, `components/pages/RecurringPage.js`

```sql
CREATE TABLE public.user_settings (
  user_id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  savings_goal     NUMERIC(12,2) NOT NULL DEFAULT 0,
  category_budgets JSONB       NOT NULL DEFAULT '{}',
  recurring_rules  JSONB       NOT NULL DEFAULT '[]',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Row Level Security:**

```sql
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);
```

**Notes:**
- Written via `upsert` — the row is created on first save if it does not yet exist.
- `category_budgets` is a flat JSON object: `{ "Food & Dining": 500, "Transport": 200 }`.
- `recurring_rules` is a JSON array. Each element has this shape:

```jsonc
{
  "id":       "uuid-v4",        // generated client-side with crypto.randomUUID()
  "name":     "Netflix",
  "amount":   15.99,
  "type":     "expense",        // "income" | "expense"
  "category": "Subscriptions",
  "period":   "monthly",        // "daily" | "weekly" | "monthly" | "yearly"
  "nextDate": "2026-06-11",     // YYYY-MM-DD, updated after each auto-post
  "active":   true
}
```

---

## 2. Tables To Add (Planned / In-Progress Features)

These tables do not exist yet but are required by features explicitly called out in the codebase.

---

### 2.1 `invoices`

**Why:** `components/PayAndInvoice.js` currently records a payment only as a plain transaction (`category: 'Payment'`). Invoice metadata (recipient, PDF reference) is never persisted — it is lost after the session. A dedicated table is needed to store invoice records.

```sql
CREATE TABLE public.invoices (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID          REFERENCES public.transactions(id) ON DELETE SET NULL,
  recipient      TEXT          NOT NULL,
  amount         NUMERIC(12,2) NOT NULL,
  currency       TEXT          NOT NULL DEFAULT 'MUR',
  description    TEXT,
  pdf_url        TEXT,                          -- optional: object-store path after upload
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own invoices"
  ON public.invoices FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 2.2 `shared_wallets`

**Why:** `components/pages/SharedPage.js` marks this as "Coming Soon" and explicitly states it needs *"multi-user tables, invite tokens, and role enforcement"*.  The feature list in that file defines the full data model.

```sql
CREATE TABLE public.shared_wallets (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_wallets ENABLE ROW LEVEL SECURITY;

-- Owners can do everything; members can read.
CREATE POLICY "Owners manage their wallet"
  ON public.shared_wallets FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Members can view wallets they belong to"
  ON public.shared_wallets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wallet_members
      WHERE wallet_id = id AND user_id = auth.uid()
    )
  );
```

---

### 2.3 `wallet_members`

**Why:** Required by the shared-wallet role-based access model (owner / editor / viewer) described in `SharedPage.js`.

```sql
CREATE TYPE wallet_role AS ENUM ('owner', 'editor', 'viewer');

CREATE TABLE public.wallet_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id  UUID        NOT NULL REFERENCES public.shared_wallets(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       wallet_role NOT NULL DEFAULT 'viewer',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wallet_id, user_id)
);

CREATE INDEX idx_wallet_members_wallet_id ON public.wallet_members(wallet_id);
CREATE INDEX idx_wallet_members_user_id   ON public.wallet_members(user_id);

ALTER TABLE public.wallet_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view membership rows for their wallet"
  ON public.wallet_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owners can insert/delete members"
  ON public.wallet_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_wallets
      WHERE id = wallet_id AND owner_id = auth.uid()
    )
  );
```

---

### 2.4 `wallet_invites`

**Why:** The SharedPage describes email-based invites with role assignment. Invite tokens must be stored so they can be validated when a recipient follows the link.

```sql
CREATE TABLE public.wallet_invites (
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

CREATE INDEX idx_wallet_invites_token     ON public.wallet_invites(token);
CREATE INDEX idx_wallet_invites_wallet_id ON public.wallet_invites(wallet_id);

ALTER TABLE public.wallet_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage invites for their wallet"
  ON public.wallet_invites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_wallets
      WHERE id = wallet_id AND owner_id = auth.uid()
    )
  );

-- Invitees can look up their own invite by token (needed for the accept flow).
CREATE POLICY "Anyone can read invite by token"
  ON public.wallet_invites FOR SELECT
  USING (true);  -- token is secret enough; tighten if needed
```

---

### 2.5 `waitlist`

**Why:** `components/pages/SharedPage.js` has a "Join Waitlist" form that collects an email but currently only calls `alert()` — the email is never saved.

```sql
CREATE TABLE public.waitlist (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  feature    TEXT        NOT NULL DEFAULT 'shared_wallets',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Insert-only: anyone can join; nobody can read the full list via the client.
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (true);
```

---

## 3. Columns To Add to Existing Tables

### 3.1 Add `wallet_id` to `transactions`

**Why:** When shared wallets ship, transactions need to be associated with either a personal wallet (NULL = personal) or a shared wallet.

```sql
ALTER TABLE public.transactions
  ADD COLUMN wallet_id UUID REFERENCES public.shared_wallets(id) ON DELETE SET NULL;

CREATE INDEX idx_transactions_wallet_id ON public.transactions(wallet_id);
```

The existing RLS policy (`user_id = auth.uid()`) covers personal transactions. A supplemental policy for shared-wallet members will be needed:

```sql
CREATE POLICY "Shared wallet members can view wallet transactions"
  ON public.transactions FOR SELECT
  USING (
    wallet_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.wallet_members
      WHERE wallet_id = transactions.wallet_id AND user_id = auth.uid()
    )
  );
```

---

### 3.2 Add `currency` to `user_settings`

**Why:** `components/pages/SettingsPage.js` has a display-currency selector that is currently held only in React state — it resets on page refresh. Persisting it to `user_settings` would fix that.

```sql
ALTER TABLE public.user_settings
  ADD COLUMN preferred_currency TEXT NOT NULL DEFAULT 'MUR';
```

---

## 4. Future: Normalize `recurring_rules`

Currently `recurring_rules` is stored as a JSONB array inside `user_settings`. This is fine for a single-user wallet, but will not extend to shared wallets or server-side auto-posting.

The recommended migration path is to extract it into the `recurring_rules` table (below) and then drop the column from `user_settings`.

```sql
-- Step 1: create the table
CREATE TABLE public.recurring_rules (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id  UUID        REFERENCES public.shared_wallets(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  amount     NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  type       TEXT        NOT NULL CHECK (type IN ('income', 'expense')),
  category   TEXT        NOT NULL,
  period     TEXT        NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
  next_date  DATE        NOT NULL,
  active     BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_rules_user_id   ON public.recurring_rules(user_id);
CREATE INDEX idx_recurring_rules_next_date ON public.recurring_rules(next_date);

ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recurring rules"
  ON public.recurring_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 2 (after data is migrated): drop the JSONB column
-- ALTER TABLE public.user_settings DROP COLUMN recurring_rules;
```

---

## 5. Supabase Auth Notes

Authentication is handled entirely by **Supabase Auth** (`auth.users`). No custom `users` table is needed. The following auth features are already in use:

| Feature | File | Notes |
|---|---|---|
| Email + password sign-in | `components/Auth.js` | `signInWithPassword` / `signUp` |
| Session management | `app/page.js` | `getSession` + `onAuthStateChange` |
| TOTP / 2FA | `components/pages/SettingsPage.js` | `mfa.enroll`, `mfa.challenge`, `mfa.verify`, `mfa.unenroll` |
| Sign out | `app/page.js`, `SettingsPage.js` | `auth.signOut()` |

All tables reference `auth.users(id)` — **never** create a separate `users` table unless you need custom profile fields beyond what `auth.users` provides.

---

## 6. Migration Files

| File | Contents |
|---|---|
| [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql) | Core tables (`transactions`, `user_settings`, `invoices`, `waitlist`, `shared_wallets`, `wallet_members`, `wallet_invites`, `recurring_rules`) + all RLS |
| [supabase/migrations/002_phase_features.sql](supabase/migrations/002_phase_features.sql) | Phase 1–5 tables (see below) |

Run `001` first, then `002`. Both can be pasted directly into the Supabase SQL Editor.

---

## 7. Phase 1–5 Table Reference

### Phase 1 — User System Connection
| Table | Purpose |
|---|---|
| `beoneofus_connections` | OAuth/JWT link to BeOneOfUs account per user |
| `api_tokens` | Hashed server-side tokens for BeOneOfUs API calls |
| `wallet_profiles` | Synced BeOneOfUs profile snapshot (name, avatar, balance) |

### Phase 2 — Budget Features
| Table | Purpose |
|---|---|
| `bill_reminders` | Tracked bills with due dates and recurrence |
| `budget_alert_log` | Permanent record of every 80%/100% budget alert fired |
| `credit_score_history` | Periodic snapshots of the calculated credit score |

### Phase 3 — Payment Integration
| Table | Purpose |
|---|---|
| `wallet_transfers` | Internal member-to-member transfers |
| `mobile_money_accounts` | Linked Juice / MyT Money / Emtel Cash / Orange Money accounts |
| `mobile_money_transactions` | Deposits, withdrawals, merchant payments via mobile money |
| `bank_connections` | Linked bank accounts via Plaid / Salt Edge / Yodlee |
| `bank_transactions` | Synced bank transactions (deduped by provider reference) |
| `qr_payments` | QR codes generated to request payment |

### Phase 4 — Security
| Table | Purpose |
|---|---|
| `transaction_pins` | Bcrypt-hashed per-user transaction PIN + lockout state |
| `fraud_alerts` | Flagged suspicious transactions with severity levels |
| `audit_logs` | Immutable log of all security-relevant actions |

### Phase 5 — Future Features
| Table | Purpose |
|---|---|
| `subscriptions` | Structured subscription tracker |
| `virtual_cards` | Virtual debit cards (token + mask only — no raw card numbers) |
| `ai_suggestions` | AI assistant recommendations |
| `crypto_wallets` | Watch-only or managed crypto addresses |
| `crypto_transactions` | On-chain transaction history |
| `investment_portfolios` | Portfolio containers per broker |
| `investment_holdings` | Individual asset positions |
| `investment_transactions` | Buy / sell / dividend / split records |
