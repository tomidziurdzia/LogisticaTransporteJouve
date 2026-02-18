-- Habilita Realtime para la tabla transactions.
-- Así, cuando n8n, el bot de WhatsApp u otro usuario inserta/actualiza/elimina
-- una transacción, todos los clientes conectados reciben el cambio y la app
-- actualiza la UI en tiempo real.
--
-- En Supabase Dashboard también podés hacerlo en:
-- Database → Replication → supabase_realtime → agregar tabla "transactions".

alter publication supabase_realtime add table public.transactions;
