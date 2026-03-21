create table if not exists audit_log (
  id bigserial primary key,
  event_type varchar(100) not null,
  actor varchar(100),
  details jsonb,
  created_at timestamptz not null default now()
);
