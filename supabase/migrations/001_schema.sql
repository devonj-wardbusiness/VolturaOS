-- supabase/migrations/001_schema.sql

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text default 'Colorado Springs',
  state text default 'CO',
  zip text,
  phone text,
  email text,
  property_type text default 'residential',
  notes text,
  created_at timestamptz default now()
);

create table customer_equipment (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  type text,
  brand text,
  amperage text,
  age_years int,
  notes text
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  job_type text not null,
  status text default 'Lead',
  scheduled_date date,
  scheduled_time time,
  notes text,
  tech_name text default 'Dev',
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table pricebook (
  id uuid primary key default gen_random_uuid(),
  job_type text not null unique,
  description_good text,
  description_better text,
  description_best text,
  price_good numeric(10,2),
  price_better numeric(10,2),
  price_best numeric(10,2),
  includes_permit boolean default false,
  notes text,
  active boolean default true
);

create table estimates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  customer_id uuid references customers(id),
  status text default 'Draft',
  tier_selected text,
  line_items jsonb,
  addons jsonb,
  subtotal numeric(10,2),
  total numeric(10,2),
  notes text,
  sent_at timestamptz,
  viewed_at timestamptz,
  approved_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates(id),
  job_id uuid references jobs(id),
  customer_id uuid references customers(id),
  line_items jsonb,
  total numeric(10,2),
  amount_paid numeric(10,2) default 0,
  balance numeric(10,2) generated always as (total - amount_paid) stored,
  status text default 'Unpaid',
  due_date date,
  notes text,
  created_at timestamptz default now()
);

create table invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  amount numeric(10,2) not null,
  payment_method text not null,
  paid_at timestamptz default now(),
  notes text
);

create table job_checklists (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  template_name text,
  items jsonb,
  completed_at timestamptz,
  updated_at timestamptz default now()
);

create table job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  url text not null,
  caption text,
  photo_type text,
  uploaded_at timestamptz default now()
);
