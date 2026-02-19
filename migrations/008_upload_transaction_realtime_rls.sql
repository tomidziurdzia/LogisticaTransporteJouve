-- Realtime: que la app reciba cambios en upload_transaction sin refresh
alter publication supabase_realtime add table public.upload_transaction;

-- RLS: mismo criterio que el resto de tablas (usuarios autenticados)
alter table public.upload_transaction enable row level security;

create policy "Full access for authenticated users"
  on public.upload_transaction for all
  to authenticated
  using (true)
  with check (true);
