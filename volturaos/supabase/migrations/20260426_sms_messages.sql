-- SMS conversation log
-- Stores all inbound and outbound SMS for in-app inbox

create table if not exists sms_messages (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid references customers(id) on delete set null,
  direction     text not null check (direction in ('inbound', 'outbound')),
  body          text not null,
  phone         text not null,  -- customer phone (normalized to E.164)
  created_at    timestamptz not null default now()
);

create index if not exists sms_messages_phone_idx on sms_messages(phone);
create index if not exists sms_messages_customer_idx on sms_messages(customer_id);
create index if not exists sms_messages_created_at_idx on sms_messages(created_at desc);
