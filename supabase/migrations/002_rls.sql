-- supabase/migrations/002_rls.sql

alter table customers enable row level security;
alter table customer_equipment enable row level security;
alter table jobs enable row level security;
alter table pricebook enable row level security;
alter table estimates enable row level security;
alter table invoices enable row level security;
alter table invoice_payments enable row level security;
alter table job_checklists enable row level security;
alter table job_photos enable row level security;

-- authenticated users can do everything (single-user app)
create policy "auth_all_customers" on customers for all to authenticated using (true) with check (true);
create policy "auth_all_customer_equipment" on customer_equipment for all to authenticated using (true) with check (true);
create policy "auth_all_jobs" on jobs for all to authenticated using (true) with check (true);
create policy "auth_all_pricebook" on pricebook for all to authenticated using (true) with check (true);
create policy "auth_all_estimates" on estimates for all to authenticated using (true) with check (true);
create policy "auth_all_invoices" on invoices for all to authenticated using (true) with check (true);
create policy "auth_all_invoice_payments" on invoice_payments for all to authenticated using (true) with check (true);
create policy "auth_all_job_checklists" on job_checklists for all to authenticated using (true) with check (true);
create policy "auth_all_job_photos" on job_photos for all to authenticated using (true) with check (true);
