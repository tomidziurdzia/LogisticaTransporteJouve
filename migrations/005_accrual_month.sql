-- Mes de imputación: permite registrar a qué mes corresponde realmente una transacción
-- (puede diferir del mes donde se registra/paga).
-- null = mismo mes que el período.
-- FK a tabla months: solo se puede imputar a meses existentes.

-- Eliminar columnas de la v1 si existen
alter table public.transactions drop column if exists accrual_month;
alter table public.transactions drop column if exists accrual_year;

-- Nueva columna FK
alter table public.transactions
  add column if not exists accrual_month_id uuid references public.months(id) on delete set null;
