-- Add is_operational flag to transactions
-- Default true: most transactions are operational
alter table public.transactions
  add column if not exists is_operational boolean not null default true;
