-- Create webhook events table to store provider events idempotently
create table if not exists public.webhook_events (
  provider text not null,
  event_id text not null,
  payload jsonb,
  received_at timestamptz default now(),
  primary key (provider, event_id)
);

create index if not exists idx_webhook_events_received_at on public.webhook_events(received_at);
