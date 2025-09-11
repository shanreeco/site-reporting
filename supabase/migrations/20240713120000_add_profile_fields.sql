alter table profiles
  add column if not exists full_name text,
  add column if not exists ic_last4 text;

