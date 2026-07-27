-- Run this in Supabase: SQL Editor. Then add the URL and anon key to js/config.js.
create table if not exists public.silver_erp_records (
  record_type text not null check (record_type in ('shops','silverEntries')),
  record_id uuid not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (record_type, record_id)
);
alter table public.silver_erp_records enable row level security;
create policy "shared ERP access" on public.silver_erp_records for all using (true) with check (true);

insert into storage.buckets (id,name,public) values ('silver-entry-images','silver-entry-images',true)
on conflict (id) do nothing;
create policy "shared ERP images" on storage.objects for all using (bucket_id='silver-entry-images') with check (bucket_id='silver-entry-images');
