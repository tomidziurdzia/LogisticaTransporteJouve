-- =============================================
-- Categories table
-- =============================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('income', 'expense', 'internal_transfer', 'adjustment')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_type_unique unique (name, type)
);

create index if not exists categories_type_idx on public.categories(type);

alter table public.categories enable row level security;

create policy "Full access for authenticated users"
  on public.categories for all
  to authenticated
  using (true)
  with check (true);

-- =============================================
-- Subcategories table
-- =============================================
create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subcategories_category_name_unique unique (category_id, name)
);

create index if not exists subcategories_category_id_idx on public.subcategories(category_id);

alter table public.subcategories enable row level security;

create policy "Full access for authenticated users"
  on public.subcategories for all
  to authenticated
  using (true)
  with check (true);

-- =============================================
-- Seed: Expense categories
-- =============================================
insert into public.categories (name, type) values
  ('Combustibles', 'expense'),
  ('Compra Rodados', 'expense'),
  ('Repuestos y Reparaciones', 'expense'),
  ('Peajes', 'expense'),
  ('Instalaciones', 'expense'),
  ('Alquileres', 'expense'),
  ('Impuestos', 'expense'),
  ('Sueldos', 'expense'),
  ('Sindicato', 'expense'),
  ('Federacion', 'expense'),
  ('Directores', 'expense'),
  ('Gastos bancarios', 'expense'),
  ('Prestamos', 'expense'),
  ('Gastos Varios', 'expense')
on conflict (name, type) do nothing;

-- =============================================
-- Seed: Income categories
-- =============================================
insert into public.categories (name, type) values
  ('Fletes', 'income'),
  ('Ventas Inst', 'income'),
  ('Ventas BU', 'income'),
  ('Otros', 'income'),
  ('Prestamos', 'income')
on conflict (name, type) do nothing;
