-- Create idempotency keys table
create table if not exists public.idempotency_keys (
  user_id uuid not null,
  key text not null,
  response jsonb,
  created_at timestamptz default now(),
  expires_at timestamptz,
  primary key (user_id, key)
);

create index if not exists idx_idempotency_keys_expires_at on public.idempotency_keys(expires_at);
