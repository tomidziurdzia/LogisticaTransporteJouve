-- =============================================
-- Months (Períodos mensuales)
-- =============================================
create table if not exists public.months (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null check (month >= 1 and month <= 12),
  label text not null,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint months_year_month_unique unique (year, month)
);

create index if not exists months_year_month_idx on public.months(year, month);

alter table public.months enable row level security;

create policy "Full access for authenticated users"
  on public.months for all
  to authenticated
  using (true)
  with check (true);

-- =============================================
-- Opening balances (Saldo de apertura por cuenta por mes)
-- =============================================
create table if not exists public.opening_balances (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  amount numeric(15,2) not null,
  created_at timestamptz not null default now(),
  constraint opening_balances_month_account_unique unique (month_id, account_id)
);

create index if not exists opening_balances_month_idx on public.opening_balances(month_id);
create index if not exists opening_balances_account_idx on public.opening_balances(account_id);

alter table public.opening_balances enable row level security;

create policy "Full access for authenticated users"
  on public.opening_balances for all
  to authenticated
  using (true)
  with check (true);

-- =============================================
-- Transactions (Cabecera de transacción)
-- =============================================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.months(id) on delete cascade,
  "date" date not null,
  type text not null check (type in ('income', 'expense', 'internal_transfer', 'adjustment')),
  description text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  row_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_month_idx on public.transactions(month_id);
create index if not exists transactions_date_idx on public.transactions("date");
create index if not exists transactions_type_idx on public.transactions(type);
create index if not exists transactions_category_idx on public.transactions(category_id);

alter table public.transactions enable row level security;

create policy "Full access for authenticated users"
  on public.transactions for all
  to authenticated
  using (true)
  with check (true);

-- =============================================
-- Transaction amounts (Montos por cuenta - pivot)
-- =============================================
create table if not exists public.transaction_amounts (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  amount numeric(15,2) not null,
  created_at timestamptz not null default now(),
  constraint transaction_amounts_tx_account_unique unique (transaction_id, account_id)
);

create index if not exists transaction_amounts_tx_idx on public.transaction_amounts(transaction_id);
create index if not exists transaction_amounts_account_idx on public.transaction_amounts(account_id);

alter table public.transaction_amounts enable row level security;

create policy "Full access for authenticated users"
  on public.transaction_amounts for all
  to authenticated
  using (true)
  with check (true);
