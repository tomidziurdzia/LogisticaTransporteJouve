-- Accounts table
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('bank','cash','wallet','investment','checks','other')),
  is_active boolean not null default true,
  allow_negative boolean not null default false,
  opening_balance numeric(18,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_name_unique unique (name)
);

create index if not exists accounts_active_idx on public.accounts(is_active);

-- Enable RLS
alter table public.accounts enable row level security;

-- RLS policies: full access for authenticated users
create policy "Full access for authenticated users"
  on public.accounts for all
  to authenticated
  using (true)
  with check (true);

-- Seed default accounts
insert into public.accounts (name, type, is_active, allow_negative, opening_balance) values
  ('Caja', 'cash', true, false, 0),
  ('Cambio', 'cash', true, false, 0),
  ('CH Fisico', 'checks', true, false, 0),
  ('CH Electronico', 'checks', true, false, 0),
  ('Galicia', 'bank', true, false, 0),
  ('Provincia', 'bank', true, false, 0),
  ('Macro', 'bank', true, false, 0),
  ('Mercado Pago', 'wallet', true, false, 0),
  ('FIMA', 'investment', true, false, 0)
on conflict (name) do nothing;
