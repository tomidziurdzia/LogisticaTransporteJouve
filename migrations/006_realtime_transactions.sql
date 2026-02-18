-- Habilita Realtime para todas las tablas que afectan la UI.
-- Así, cuando vos u otro usuario crea/actualiza/elimina cualquier dato,
-- todos los clientes conectados reciben el cambio y la app actualiza al instante.
--
-- En Supabase Dashboard también podés hacerlo en:
-- Database → Replication → supabase_realtime → agregar las tablas listadas abajo.

alter publication supabase_realtime add table public.months;
alter publication supabase_realtime add table public.accounts;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.subcategories;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.transaction_amounts;
alter publication supabase_realtime add table public.opening_balances;
