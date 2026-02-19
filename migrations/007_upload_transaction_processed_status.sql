-- Agregar status 'processed' a upload_transaction (cuando ya se pasó a transactions)
alter table public.upload_transaction
  drop constraint if exists upload_transaction_status_check;

alter table public.upload_transaction
  add constraint upload_transaction_status_check check (
    status = any (
      array[
        'pending'::text,
        'approved'::text,
        'cancelled'::text,
        'processed'::text
      ]
    )
  );
