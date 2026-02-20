-- Add nullable description column to upload_transaction
alter table public.upload_transaction
  add column if not exists description text null;
